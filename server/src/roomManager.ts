import { Server, Socket } from "socket.io";
import { v4 as uuid } from "uuid";
import { getShuffledQuestions } from "./questions";
import {
  GameState,
  OutgoingRoomState,
  Player,
  Room,
  Round,
  Submission,
  Vote,
} from "./types";

const ROOM_CODE_LENGTH = 4;
const ROOM_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const MIN_PLAYERS = (() => {
  const parsed = Number(process.env.MIN_PLAYERS);
  if (Number.isFinite(parsed) && parsed >= 2) {
    return Math.floor(parsed);
  }
  return 3;
})();

const DEFAULT_SETTINGS = {
  maxRounds: 5,
  secondsToAnswer: 45,
  secondsToVote: 30,
  secondsToReveal: 10,
};

export class RoomManager {
  private rooms = new Map<string, Room>();
  private heartbeat: NodeJS.Timeout;

  constructor(private io: Server) {
    this.heartbeat = setInterval(() => this.tickRooms(), 1000);
  }

  createRoom(hostName: string, socket: Socket): OutgoingRoomState {
    const code = this.generateRoomCode();
    const hostPlayer = this.buildPlayer(hostName, code, socket.id, true);

    const room: Room = {
      code,
      hostId: hostPlayer.id,
      players: [hostPlayer],
      gameState: "lobby",
      currentRoundIndex: -1,
      rounds: [],
      settings: { ...DEFAULT_SETTINGS },
      createdAt: Date.now(),
      questionDeck: getShuffledQuestions(),
      timers: {
        answer: null,
        vote: null,
        reveal: null,
      },
      deadlines: {},
    };

    this.rooms.set(code, room);
    socket.join(code);
    this.emitRoom(room);
    return this.toPublicRoom(room);
  }

  joinRoom(roomCode: string, name: string, socket: Socket): OutgoingRoomState {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) {
      throw new Error("Room not found");
    }
    if (room.gameState !== "lobby") {
      throw new Error("Game already started");
    }
    if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("Name already taken");
    }

    const player = this.buildPlayer(name, room.code, socket.id, false);
    room.players.push(player);
    socket.join(room.code);
    this.emitRoom(room);
    return this.toPublicRoom(room);
  }

  leaveRoom(socketId: string): void {
    const { room, player } = this.findPlayerBySocket(socketId) ?? {};
    if (!room || !player) {
      return;
    }

    if (room.gameState === "lobby") {
      room.players = room.players.filter((p) => p.id !== player.id);
      if (room.players.length === 0) {
        this.disposeRoom(room.code);
        return;
      }
      if (player.isHost) {
        const nextHost = room.players[0];
        if (nextHost) {
          nextHost.isHost = true;
          room.hostId = nextHost.id;
        }
      }
    } else {
      player.connected = false;
      if (player.isHost) {
        const replacement = room.players.find((p) => p.connected);
        if (replacement) {
          replacement.isHost = true;
          room.hostId = replacement.id;
          player.isHost = false;
        }
      }
      if (player.isHotSeat) {
        this.advanceRound(room);
      }
    }

    if (room.gameState !== "lobby" && room.players.filter((p) => p.connected).length < MIN_PLAYERS) {
      this.clearTimers(room);
      room.gameState = "finalSummary";
    }

    this.emitRoom(room);
  }

  reconnectPlayer(playerId: string, socket: Socket): OutgoingRoomState | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.connected = true;
        player.socketId = socket.id;
        socket.join(room.code);
        this.emitRoom(room);
        return this.toPublicRoom(room);
      }
    }
    return null;
  }

  startGame(socketId: string): void {
    const { room, player } = this.findPlayerBySocket(socketId) ?? {};
    if (!room || !player) {
      throw new Error("Player not found");
    }
    if (!player.isHost) {
      throw new Error("Only the host can start");
    }
    if (room.players.length < MIN_PLAYERS) {
      throw new Error(`Need at least ${MIN_PLAYERS} players`);
    }
    if (room.gameState !== "lobby" && room.gameState !== "finalSummary") {
      throw new Error("Game already started");
    }

    if (room.gameState === "finalSummary") {
      room.players.forEach((p) => {
        p.score = 0;
        p.numPeopleTricked = 0;
        p.numCorrectGuesses = 0;
        p.isHotSeat = false;
      });
    }

    room.rounds = [];
    room.currentRoundIndex = -1;
    room.questionDeck = getShuffledQuestions();
    this.advanceRound(room);
  }

  submitAnswer(socketId: string, text: string): void {
    const { room, player } = this.findPlayerBySocket(socketId) ?? {};
    if (!room || !player) {
      throw new Error("Player not found");
    }
    if (room.gameState !== "collectingAnswers") {
      throw new Error("Not accepting answers right now");
    }
    const round = this.currentRound(room);
    if (!round) {
      throw new Error("No active round");
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error("Answer cannot be empty");
    }
    if (player.isHotSeat) {
      // hot seat must submit real answer
      this.upsertSubmission(round, {
        playerId: player.id,
        text: trimmed,
        isRealAnswer: true,
      });
    } else {
      this.upsertSubmission(round, {
        playerId: player.id,
        text: trimmed,
        isRealAnswer: false,
      });
    }

    // Auto advance if all submissions collected
    const totalNeeded = room.players.filter((p) => p.connected).length;
    const submissionCount = new Set(round.submissions.map((s) => s.playerId)).size;
    const hotSeatSubmitted = round.submissions.some((s) => s.isRealAnswer);
    if (hotSeatSubmitted && submissionCount === totalNeeded) {
      this.startVotingPhase(room);
      return;
    }

    this.emitRoom(room);
  }

  submitVote(socketId: string, submissionPlayerId: string): void {
    const { room, player } = this.findPlayerBySocket(socketId) ?? {};
    if (!room || !player) {
      throw new Error("Player not found");
    }
    if (room.gameState !== "voting") {
      throw new Error("Not accepting votes right now");
    }
    const round = this.currentRound(room);
    if (!round) {
      throw new Error("No active round");
    }
    if (player.isHotSeat) {
      throw new Error("Hot seat cannot vote");
    }
    if (player.id === submissionPlayerId) {
      throw new Error("Cannot vote for yourself");
    }
    if (!round.submissions.some((s) => s.playerId === submissionPlayerId)) {
      throw new Error("Submission not found");
    }
    if (round.votes.some((vote) => vote.voterId === player.id)) {
      throw new Error("Vote already submitted");
    }

    round.votes.push({ voterId: player.id, submissionPlayerId });

    const votingPlayers = room.players.filter((p) => p.connected && !p.isHotSeat).length;
    if (round.votes.length === votingPlayers) {
      this.revealResults(room);
      return;
    }

    this.emitRoom(room);
  }

  updateSettings(socketId: string, settings: Partial<Room["settings"]>): void {
    const { room, player } = this.findPlayerBySocket(socketId) ?? {};
    if (!room || !player) {
      throw new Error("Player not found");
    }
    if (!player.isHost) {
      throw new Error("Only host can update settings");
    }
    room.settings = {
      ...room.settings,
      ...settings,
    };
    this.emitRoom(room);
  }

  getRoomByCode(code: string): OutgoingRoomState | null {
    const room = this.rooms.get(code.toUpperCase());
    return room ? this.toPublicRoom(room) : null;
  }

  private advanceRound(room: Room): void {
    this.clearTimers(room);
    const connectedPlayers = room.players.filter((p) => p.connected);
    if (connectedPlayers.length < MIN_PLAYERS) {
      room.gameState = "finalSummary";
      this.emitRoom(room);
      return;
    }

    if (room.rounds.length >= room.settings.maxRounds) {
      room.gameState = "finalSummary";
      this.emitRoom(room);
      return;
    }

    const newRound = this.createRound(room);
    room.rounds.push(newRound);
    room.currentRoundIndex = room.rounds.length - 1;
    room.gameState = "collectingAnswers";
    newRound.status = "collectingAnswers";
    room.deadlines.answer = Date.now() + room.settings.secondsToAnswer * 1000;
    room.deadlines.vote = undefined;
    room.deadlines.reveal = undefined;

    room.timers.answer = setTimeout(() => {
      this.startVotingPhase(room);
    }, room.settings.secondsToAnswer * 1000);

    this.emitRoom(room);
  }

  private startVotingPhase(room: Room): void {
    const round = this.currentRound(room);
    if (!round) return;
    if (!round.submissions.some((s) => s.isRealAnswer)) {
      // force placeholder
      const hotSeat = this.getHotSeat(room);
      if (hotSeat) {
        round.submissions.push({
          playerId: hotSeat.id,
          text: "(No answer provided)",
          isRealAnswer: true,
        });
      }
    }
    room.gameState = "voting";
    round.status = "voting";
    this.clearTimer(room, "answer");
    room.deadlines.vote = Date.now() + room.settings.secondsToVote * 1000;
    room.deadlines.reveal = undefined;

    this.shuffle(round.submissions);

    room.timers.vote = setTimeout(() => {
      this.revealResults(room);
    }, room.settings.secondsToVote * 1000);

    this.emitRoom(room);
  }

  private revealResults(room: Room): void {
    const round = this.currentRound(room);
    if (!round) return;
    this.clearTimer(room, "answer");
    this.clearTimer(room, "vote");

    room.gameState = "showingResults";
    round.status = "showingResults";
    this.scoreRound(room, round);
    room.deadlines.reveal = Date.now() + room.settings.secondsToReveal * 1000;

    room.timers.reveal = setTimeout(() => {
      this.clearTimer(room, "reveal");
      if (room.rounds.length >= room.settings.maxRounds) {
        room.gameState = "finalSummary";
        this.emitRoom(room);
      } else {
        this.advanceRound(room);
      }
    }, room.settings.secondsToReveal * 1000);

    this.emitRoom(room);
  }

  private tickRooms(): void {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (room.gameState === "collectingAnswers" && room.deadlines.answer && now >= room.deadlines.answer) {
        this.startVotingPhase(room);
        continue;
      }
      if (room.gameState === "voting" && room.deadlines.vote && now >= room.deadlines.vote) {
        this.revealResults(room);
        continue;
      }
      if (room.gameState === "showingResults" && room.deadlines.reveal && now >= room.deadlines.reveal) {
        this.clearTimer(room, "reveal");
        if (room.rounds.length >= room.settings.maxRounds) {
          room.gameState = "finalSummary";
          this.emitRoom(room);
        } else {
          this.advanceRound(room);
        }
      }
    }
  }

  private createRound(room: Room): Round {
    const hotSeat = this.selectNextHotSeat(room);
    room.players.forEach((p) => {
      p.isHotSeat = p.id === hotSeat?.id;
    });
    const question = this.drawQuestion(room);
    return {
      id: uuid(),
      hotSeatPlayerId: hotSeat?.id ?? "",
      question,
      submissions: [],
      votes: [],
      status: "pending",
    };
  }

  private selectNextHotSeat(room: Room): Player | undefined {
    const eligible = room.players.filter((p) => p.connected);
    if (eligible.length === 0) {
      return undefined;
    }
    const nextIndex = room.rounds.length % eligible.length;
    return eligible[nextIndex];
  }

  private drawQuestion(room: Room): string {
    if (room.questionDeck.length === 0) {
      room.questionDeck = getShuffledQuestions();
    }
    return room.questionDeck.pop() ?? "Mystery question";
  }

  private currentRound(room: Room): Round | undefined {
    if (room.currentRoundIndex < 0) return undefined;
    return room.rounds[room.currentRoundIndex];
  }

  private getHotSeat(room: Room): Player | undefined {
    return room.players.find((p) => p.isHotSeat);
  }

  private scoreRound(room: Room, round: Round): void {
    const submissionByPlayer = new Map<string, Submission>();
    round.submissions.forEach((submission) => {
      submissionByPlayer.set(submission.playerId, submission);
    });

    const hotSeat = this.getHotSeat(room);

    round.votes.forEach((vote) => {
      const submission = submissionByPlayer.get(vote.submissionPlayerId);
      const voter = room.players.find((p) => p.id === vote.voterId);
      if (!submission || !voter) {
        return;
      }

      if (submission.isRealAnswer) {
        voter.score += 2;
        voter.numCorrectGuesses += 1;
        if (hotSeat) {
          hotSeat.score += 1;
        }
      } else {
        const submissionOwner = room.players.find((p) => p.id === submission.playerId);
        if (submissionOwner) {
          submissionOwner.score += 1;
          submissionOwner.numPeopleTricked += 1;
        }
      }
    });
    round.status = "complete";
  }

  private upsertSubmission(round: Round, submission: Submission): void {
    const index = round.submissions.findIndex((s) => s.playerId === submission.playerId);
    if (index >= 0) {
      round.submissions[index] = submission;
    } else {
      round.submissions.push(submission);
    }
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i]!;
      arr[i] = arr[j]!;
      arr[j] = temp;
    }
  }

  private buildPlayer(name: string, roomCode: string, socketId: string, isHost: boolean): Player {
    return {
      id: uuid(),
      name: name.trim(),
      roomCode,
      socketId,
      score: 0,
      numPeopleTricked: 0,
      numCorrectGuesses: 0,
      isHost,
      isHotSeat: false,
      connected: true,
    };
  }

  private findPlayerBySocket(socketId: string):
    | { room: Room; player: Player }
    | undefined {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (player) {
        return { room, player };
      }
    }
    return undefined;
  }

  private toPublicRoom(room: Room): OutgoingRoomState {
    return {
      ...room,
      timers: {
        answerDeadline: room.deadlines.answer,
        voteDeadline: room.deadlines.vote,
        revealDeadline: room.deadlines.reveal,
      },
    };
  }

  private emitRoom(room: Room): void {
    this.io.to(room.code).emit("roomUpdated", this.toPublicRoom(room));
  }

  private clearTimer(room: Room, key: keyof Room["timers"]): void {
    const timer = room.timers[key];
    if (timer) {
      clearTimeout(timer);
      room.timers[key] = null;
    }
  }

  private clearTimers(room: Room): void {
    this.clearTimer(room, "answer");
    this.clearTimer(room, "vote");
    this.clearTimer(room, "reveal");
  }

  private disposeRoom(code: string): void {
    const room = this.rooms.get(code);
    if (!room) return;
    this.clearTimers(room);
    this.rooms.delete(code);
  }

  private generateRoomCode(): string {
    let code = "";
    do {
      code = Array.from({ length: ROOM_CODE_LENGTH })
        .map(() => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)])
        .join("");
    } while (this.rooms.has(code));
    return code;
  }
}


