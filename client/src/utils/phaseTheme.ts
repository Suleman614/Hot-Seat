import type { GameState } from "../types";

export type PhaseTheme = {
  header: string;
  accentText: string;
  promptBorder: string;
  promptGlow: string;
  focusRing: string;
};

const THEMES: Record<string, PhaseTheme> = {
  lobby: {
    header: "border-slate-200 bg-white/80",
    accentText: "text-slate-500",
    promptBorder: "border-slate-200",
    promptGlow: "shadow-[0_0_30px_rgba(148,163,184,0.2)]",
    focusRing: "ring-slate-200",
  },
  answering: {
    header: "border-amber-200 bg-amber-50/70",
    accentText: "text-amber-600",
    promptBorder: "border-amber-200",
    promptGlow: "shadow-[0_0_30px_rgba(251,191,36,0.35)]",
    focusRing: "ring-amber-200",
  },
  review: {
    header: "border-violet-200 bg-violet-50/70",
    accentText: "text-violet-600",
    promptBorder: "border-violet-200",
    promptGlow: "shadow-[0_0_30px_rgba(167,139,250,0.35)]",
    focusRing: "ring-violet-200",
  },
  voting: {
    header: "border-sky-200 bg-sky-50/70",
    accentText: "text-sky-600",
    promptBorder: "border-sky-200",
    promptGlow: "shadow-[0_0_30px_rgba(56,189,248,0.35)]",
    focusRing: "ring-sky-200",
  },
  reveal: {
    header: "border-rose-200 bg-rose-50/70",
    accentText: "text-rose-600",
    promptBorder: "border-rose-200",
    promptGlow: "shadow-[0_0_30px_rgba(251,113,133,0.35)]",
    focusRing: "ring-rose-200",
  },
  summary: {
    header: "border-amber-300 bg-amber-100/70",
    accentText: "text-amber-700",
    promptBorder: "border-amber-300",
    promptGlow: "shadow-[0_0_30px_rgba(251,191,36,0.4)]",
    focusRing: "ring-amber-300",
  },
};

export const resolvePhaseTheme = (state: GameState, flowStep?: string): PhaseTheme => {
  if (flowStep === "review") return THEMES.review;
  if (flowStep === "reveal" || flowStep === "scoring") return THEMES.reveal;
  if (flowStep === "scoreboard" || flowStep === "recap") return THEMES.reveal;
  switch (state) {
    case "collectingAnswers":
      return THEMES.answering;
    case "reviewAnswers":
      return THEMES.review;
    case "voting":
      return THEMES.voting;
    case "showingResults":
      return THEMES.reveal;
    case "finalSummary":
      return THEMES.summary;
    default:
      return THEMES.lobby;
  }
};
