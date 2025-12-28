export type GameState =
  | "lobby"
  | "collectingAnswers"
  | "reviewAnswers"
  | "voting"
  | "showingResults"
  | "finalSummary";

export interface Player {
  id: string;
  socketId: string;
  name: string;
  roomCode: string;
  score: number;
  numPeopleTricked: number;
  numCorrectGuesses: number;
  isHotSeat: boolean;
  connected: boolean;
}

export interface Settings {
  maxRounds: number;
  secondsToAnswer: number;
  secondsToVote: number;
  secondsToReveal: number;
}

export interface Submission {
  playerId: string;
  text: string;
  isRealAnswer: boolean;
}

export interface Vote {
  voterId: string;
  submissionPlayerId: string;
}

export type RoundStatus =
  | "pending"
  | "collectingAnswers"
  | "reviewAnswers"
  | "voting"
  | "showingResults"
  | "complete";

export interface Round {
  id: string;
  hotSeatPlayerId: string;
  question: string;
  submissions: Submission[];
  votes: Vote[];
  status: RoundStatus;
  revealedAt?: number;
  reviewOrder?: Submission[];
  reviewIndex?: number;
}

export interface Room {
  code: string;
  hostId: string;
  hostName: string;
  hostSocketId?: string;
  players: Player[];
  gameState: GameState;
  currentRoundIndex: number;
  rounds: Round[];
  settings: Settings;
  createdAt: number;
  questionDeck: string[];
  timers: {
    answer: NodeJS.Timeout | null;
    vote: NodeJS.Timeout | null;
    reveal: NodeJS.Timeout | null;
  };
  deadlines: {
    answer?: number;
    vote?: number;
    reveal?: number;
  };
}

export interface OutgoingRoomState extends Omit<Room, "timers" | "hostSocketId"> {
  timers: {
    answerDeadline?: number;
    voteDeadline?: number;
    revealDeadline?: number;
  };
}
