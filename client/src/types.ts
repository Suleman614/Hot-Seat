export type GameState =
  | "lobby"
  | "collectingAnswers"
  | "reviewAnswers"
  | "voting"
  | "showingResults"
  | "finalSummary";

export interface Player {
  id: string;
  name: string;
  roomCode: string;
  score: number;
  numPeopleTricked: number;
  numCorrectGuesses: number;
  isHost: boolean;
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

export interface Round {
  id: string;
  hotSeatPlayerId: string;
  question: string;
  submissions: Submission[];
  votes: Vote[];
  status: "pending" | "collectingAnswers" | "reviewAnswers" | "voting" | "showingResults" | "complete";
  reviewOrder?: Submission[];
  reviewIndex?: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Player[];
  gameState: GameState;
  currentRoundIndex: number;
  rounds: Round[];
  settings: Settings;
  createdAt: number;
  questionDeck: string[];
  timers: {
    answerDeadline?: number;
    voteDeadline?: number;
    revealDeadline?: number;
  };
  deadlines: {
    answer?: number;
    vote?: number;
    reveal?: number;
  };
}

export interface ActionResult<T = unknown> {
  ok: boolean;
  room?: RoomState;
  error?: string;
  data?: T;
}

