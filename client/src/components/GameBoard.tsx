import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Countdown } from "./Countdown";
import { PhaseInterstitial } from "./PhaseInterstitial";
import { ScreenFade } from "./ScreenFade";
import { ScorePop } from "./ScorePop";
import type { Player, RoomState, Submission } from "../types";
import { playSfx } from "../utils/sfx";
import { resolvePhaseTheme } from "../utils/phaseTheme";

interface ReviewState {
  prompt: string;
  totalAnswers: number;
  answer: Submission | null;
}

type FlowStep =
  | "answering"
  | "review"
  | "voting"
  | "reveal"
  | "scoring"
  | "scoreboard"
  | "recap";

type InterstitialConfig = {
  title: string;
  subtitle?: string;
  durationMs: number;
  countdownSeconds?: number;
};

type ScorePopEvent = {
  id: string;
  playerId: string;
  amount: number;
  label: string;
};

interface GameBoardProps {
  room: RoomState;
  me: Player | null;
  isHost: boolean;
  onSubmitAnswer: (text: string) => Promise<void>;
  onSubmitVote: (submissionPlayerId: string) => Promise<void>;
  onReviewNext: () => Promise<void>;
  onAdvanceRound: () => Promise<void>;
  onVetoQuestion: () => Promise<void>;
  reviewState: ReviewState | null;
  showNextAnswer: boolean;
}

export function GameBoard({
  room,
  me,
  isHost,
  onSubmitAnswer,
  onSubmitVote,
  onReviewNext,
  onAdvanceRound,
  onVetoQuestion,
  reviewState,
  showNextAnswer,
}: GameBoardProps) {
  const [answer, setAnswer] = useState("");
  const currentRound = room.rounds[room.currentRoundIndex];
  const [submitting, setSubmitting] = useState(false);
  const [spotlightAnswer, setSpotlightAnswer] = useState<Submission | null>(null);
  const [spotlightVisible, setSpotlightVisible] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>("answering");
  const [interstitial, setInterstitial] = useState<InterstitialConfig | null>(null);
  const [countdownKey, setCountdownKey] = useState(0);
  const [scorePops, setScorePops] = useState<ScorePopEvent[]>([]);
  const timeoutsRef = useRef<number[]>([]);
  const interstitialCompleteRef = useRef<(() => void) | null>(null);
  const lastPhaseRef = useRef<RoomState["gameState"] | null>(null);
  const lastRoundIdRef = useRef<string | null>(null);

  const myVote = me && currentRound?.votes.find((vote) => vote.voterId === me.id);
  const hotSeat = currentRound && room.players.find((p) => p.id === currentRound.hotSeatPlayerId);
  const mySubmission = me && currentRound?.submissions.find((submission) => submission.playerId === me.id);
  const hasSubmittedAnswer = Boolean(mySubmission);

  const submissionMap = useMemo(() => {
    if (!currentRound) return new Map<string, number>();
    const map = new Map<string, number>();
    currentRound.votes.forEach((vote) => {
      map.set(vote.submissionPlayerId, (map.get(vote.submissionPlayerId) ?? 0) + 1);
    });
    return map;
  }, [currentRound]);

  const mostConvincingId = useMemo(() => {
    if (!currentRound || currentRound.submissions.length === 0) return null;
    let bestId: string | null = null;
    let bestVotes = -1;
    currentRound.submissions.forEach((submission) => {
      if (submission.isRealAnswer) return;
      const votes = submissionMap.get(submission.playerId) ?? 0;
      if (votes > bestVotes) {
        bestVotes = votes;
        bestId = submission.playerId;
      }
    });
    return bestId;
  }, [currentRound, submissionMap]);

  const votersBySubmission = useMemo(() => {
    if (!currentRound) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    currentRound.votes.forEach((vote) => {
      const voterName = room.players.find((player) => player.id === vote.voterId)?.name ?? "Unknown";
      const list = map.get(vote.submissionPlayerId) ?? [];
      list.push(voterName);
      map.set(vote.submissionPlayerId, list);
    });
    return map;
  }, [currentRound, room.players]);

  const clearFlowTimers = useCallback(() => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  }, []);

  const scheduleFlow = useCallback(
    (callback: () => void, delayMs: number) => {
      const timeoutId = window.setTimeout(callback, delayMs);
      timeoutsRef.current.push(timeoutId);
    },
    [],
  );

  const handleInterstitialComplete = useCallback(() => {
    const complete = interstitialCompleteRef.current;
    interstitialCompleteRef.current = null;
    setInterstitial(null);
    complete?.();
  }, []);

  const showInterstitial = useCallback(
    (config: InterstitialConfig, onComplete: () => void) => {
      clearFlowTimers();
      setInterstitial(config);
      interstitialCompleteRef.current = onComplete;
      setCountdownKey((prev) => prev + 1);
      if (!config.countdownSeconds) {
        scheduleFlow(() => {
          handleInterstitialComplete();
        }, config.durationMs);
      }
    },
    [clearFlowTimers, handleInterstitialComplete, scheduleFlow],
  );

  const startRound = useCallback(() => {
    const roundNumber = room.currentRoundIndex + 1;
    playSfx("chime");
    showInterstitial(
      {
        title: `Round ${roundNumber}`,
        subtitle: "Get ready to answer...",
        durationMs: 2000,
        countdownSeconds: 2,
      },
      () => {
        setFlowStep("answering");
      },
    );
  }, [room.currentRoundIndex, showInterstitial]);

  const startReview = useCallback(() => {
    playSfx("whoosh");
    showInterstitial(
      {
        title: "Answers locked in!",
        subtitle: "Preparing the review...",
        durationMs: 1200,
      },
      () => {
        setFlowStep("review");
      },
    );
  }, [showInterstitial]);

  const startVoting = useCallback(() => {
    playSfx("whoosh");
    showInterstitial(
      {
        title: "Get ready to vote!",
        subtitle: "Trust your instincts...",
        durationMs: 1000,
        countdownSeconds: 1,
      },
      () => {
        setFlowStep("voting");
      },
    );
  }, [showInterstitial]);

  const startReveal = useCallback(() => {
    playSfx("sparkle");
    showInterstitial(
      {
        title: "Revealing the real answer...",
        subtitle: "Hold on tight.",
        durationMs: 1000,
        countdownSeconds: 1,
      },
      () => {
        setFlowStep("reveal");
      },
    );
  }, [showInterstitial]);

  const startScoring = useCallback(() => {
    playSfx("whoosh");
    showInterstitial(
      {
        title: "Scoring the round...",
        subtitle: "Points incoming!",
        durationMs: 1000,
        countdownSeconds: 1,
      },
      () => {
        setFlowStep("scoring");
      },
    );
  }, [showInterstitial]);

  const startRecap = useCallback(() => {
    setFlowStep("recap");
  }, []);

  const nextRound = useCallback(async () => onAdvanceRound(), [onAdvanceRound]);

  const buildScorePops = useCallback((): ScorePopEvent[] => {
    if (!currentRound) return [];
    const submissionByPlayer = new Map<string, Submission>();
    currentRound.submissions.forEach((submission) => {
      submissionByPlayer.set(submission.playerId, submission);
    });

    const normalizeAnswer = (text: string) => text.trim().toLowerCase();
    const fakeGroups = new Map<string, string[]>();
    currentRound.submissions.forEach((submission) => {
      if (submission.isRealAnswer) return;
      const normalized = normalizeAnswer(submission.text);
      const group = fakeGroups.get(normalized) ?? [];
      group.push(submission.playerId);
      fakeGroups.set(normalized, group);
    });

    const hotSeatSubmission = currentRound.submissions.find((submission) => submission.isRealAnswer);
    const hotSeatAnswer = hotSeatSubmission ? normalizeAnswer(hotSeatSubmission.text) : "";

    const events: ScorePopEvent[] = [];
    if (hotSeatAnswer) {
      currentRound.submissions.forEach((submission) => {
        if (submission.isRealAnswer) return;
        if (normalizeAnswer(submission.text) === hotSeatAnswer) {
          events.push({
            id: `${submission.playerId}-mimic`,
            playerId: submission.playerId,
            amount: 3,
            label: "+3 (mimic)",
          });
        }
      });
    }

    currentRound.votes.forEach((vote, index) => {
      const submission = submissionByPlayer.get(vote.submissionPlayerId);
      if (!submission) return;
      if (submission.isRealAnswer) {
        events.push({
          id: `${vote.voterId}-correct-${index}`,
          playerId: vote.voterId,
          amount: 2,
          label: "+2 (correct)",
        });
        return;
      }
      const normalized = normalizeAnswer(submission.text);
      const group = fakeGroups.get(normalized) ?? [submission.playerId];
      const splitValue = 1 / group.length;
      group.forEach((playerId) => {
        events.push({
          id: `${playerId}-tricked-${index}`,
          playerId,
          amount: splitValue,
          label: `+${splitValue.toFixed(1)} (tricked)`,
        });
      });
    });

    return events;
  }, [currentRound]);

  useEffect(() => {
    setAnswer("");
    setSubmitting(false);
  }, [currentRound?.id]);

  useEffect(() => {
    if (!currentRound) return;
    const phase = room.gameState;
    const lastPhase = lastPhaseRef.current;
    const roundChanged = currentRound.id !== lastRoundIdRef.current;

    if (roundChanged && phase === "collectingAnswers") {
      lastRoundIdRef.current = currentRound.id;
      startRound();
      lastPhaseRef.current = phase;
      return;
    }

    if (phase !== lastPhase) {
      if (phase === "reviewAnswers") {
        startReview();
      } else if (phase === "voting") {
        startVoting();
      } else if (phase === "showingResults") {
        startReveal();
      } else if (phase === "collectingAnswers") {
        startRound();
      }
      lastPhaseRef.current = phase;
    }
  }, [room.gameState, currentRound, startRound, startReview, startVoting, startReveal]);

  useEffect(() => {
    if (room.gameState !== "reviewAnswers") {
      setSpotlightAnswer(null);
      setSpotlightVisible(false);
      return;
    }
    const nextAnswer = reviewState?.answer ?? null;
    if (!nextAnswer) {
      setSpotlightAnswer(null);
      setSpotlightVisible(false);
      return;
    }
    if (!spotlightAnswer || spotlightAnswer.playerId === nextAnswer.playerId) {
      setSpotlightAnswer(nextAnswer);
      setSpotlightVisible(true);
      return;
    }
    setSpotlightVisible(false);
    const timeout = window.setTimeout(() => {
      setSpotlightAnswer(nextAnswer);
      setSpotlightVisible(true);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [room.gameState, reviewState?.answer, spotlightAnswer?.playerId]);

  useEffect(() => {
    if (room.gameState !== "collectingAnswers" || !me || hasSubmittedAnswer) {
      return;
    }
    const deadline = room.timers.answerDeadline;
    if (!deadline) {
      return;
    }
    const delay = Math.max(0, deadline - Date.now() - 250);
    const timeout = window.setTimeout(() => {
      const trimmed = answer.trim();
      if (!trimmed || hasSubmittedAnswer) {
        return;
      }
      setSubmitting(true);
      void onSubmitAnswer(trimmed).finally(() => {
        setSubmitting(false);
      });
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [room.gameState, room.timers.answerDeadline, me, hasSubmittedAnswer, answer, onSubmitAnswer]);

  useEffect(() => {
    if (room.gameState !== "showingResults") {
      if (scorePops.length > 0) {
        setScorePops([]);
      }
      return;
    }
    if (flowStep === "reveal") {
      clearFlowTimers();
      scheduleFlow(() => {
        startScoring();
      }, 1200);
    }
    if (flowStep === "scoring") {
      setScorePops(buildScorePops());
      clearFlowTimers();
      scheduleFlow(() => {
        setFlowStep("scoreboard");
      }, 1600);
    }
    if (flowStep === "scoreboard") {
      clearFlowTimers();
      scheduleFlow(() => {
        startRecap();
      }, 1600);
    }
  }, [
    room.gameState,
    flowStep,
    buildScorePops,
    clearFlowTimers,
    scheduleFlow,
    startScoring,
    startRecap,
    scorePops.length,
  ]);

  useEffect(() => {
    return () => {
      clearFlowTimers();
    };
  }, [clearFlowTimers]);

  if (!currentRound) {
    return (
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-10 text-center">
        <p className="text-2xl font-semibold text-slate-800">Setting up the game...</p>
      </div>
    );
  }

  const handleSubmitAnswer = async (event: FormEvent) => {
    event.preventDefault();
    if (!answer.trim() || hasSubmittedAnswer) return;
    setSubmitting(true);
    await onSubmitAnswer(answer.trim());
    playSfx("click");
    setSubmitting(false);
  };

  const handleVote = async (submissionPlayerId: string) => {
    if (me?.isHotSeat || myVote || submissionPlayerId === me?.id) {
      return;
    }
    setSubmitting(true);
    await onSubmitVote(submissionPlayerId);
    playSfx("ding");
    setSubmitting(false);
  };

  const handleAdvanceRound = async () => {
    if (!isHost || submitting) return;
    setSubmitting(true);
    await nextRound();
    setSubmitting(false);
  };

  const handleReviewNext = async () => {
    if (!isHost || submitting) return;
    setSubmitting(true);
    await onReviewNext();
    setSubmitting(false);
  };

  const handleVeto = async () => {
    if (!isHost || submitting) return;
    setSubmitting(true);
    await onVetoQuestion();
    setSubmitting(false);
  };

  const phase = room.gameState;
  const isFinalRound = room.rounds.length >= room.settings.maxRounds;
  const canVeto = phase === "collectingAnswers" && isHost && (currentRound?.submissions.length ?? 0) === 0;
  const spotlightPrompt = reviewState?.prompt ?? currentRound.question;
  const hasSpotlightAnswer = Boolean(spotlightAnswer);
  const spotlightHeavy = hasSpotlightAnswer || flowStep === "reveal" || flowStep === "scoring";
  const overlayOpacity = spotlightHeavy ? "opacity-60" : "opacity-40";
  const vignetteOpacity = spotlightHeavy ? "opacity-70" : "opacity-40";
  const spotlightActive = flowStep === "review" || flowStep === "reveal" || flowStep === "scoring";
  const dimClass = spotlightActive || interstitial ? "opacity-40 pointer-events-none" : "opacity-100";
  const connectedPlayers = room.players.filter((player) => player.connected);
  const submittedIds = new Set(currentRound.submissions.map((submission) => submission.playerId));
  const voteIds = new Set(currentRound.votes.map((vote) => vote.voterId));
  const showAnswerStatus = phase === "collectingAnswers" && flowStep === "answering";
  const showVoteStatus = phase === "voting" && flowStep === "voting";
  const waitingForAnswers = connectedPlayers.filter((player) => !submittedIds.has(player.id));
  const waitingForVotes = connectedPlayers.filter(
    (player) => !player.isHotSeat && !voteIds.has(player.id),
  );
  const realSubmission = currentRound.submissions.find((submission) => submission.isRealAnswer);
  const showScoreboard = phase !== "showingResults" || flowStep === "scoreboard" || flowStep === "recap";
  const theme = resolvePhaseTheme(phase, flowStep);

  return (
    <div className="relative min-h-screen">
      <ScreenFade activeKey={`${flowStep}-${currentRound.id}`} className="min-h-screen">
        <div
          className={`mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10 transition-opacity duration-200 md:flex-row ${dimClass}`}
        >
          <div className="flex-1 space-y-4 rounded-3xl bg-white/90 p-6 shadow-2xl shadow-slate-200 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`text-xs uppercase tracking-[0.3em] ${theme.accentText}`}>{phaseLabel(phase)}</p>
                <div
                  className={`mt-2 rounded-2xl border bg-white/80 px-4 py-3 ${theme.promptBorder} ${theme.promptGlow}`}
                >
                  <h2 className="text-2xl font-black text-slate-900">{currentRound.question}</h2>
                </div>
                {hotSeat && (
                  <p className="mt-2 text-sm text-slate-500">
                    Hot Seat:
                    <span className="ml-2 rounded-full bg-pink-100 px-2 py-0.5 text-sm font-semibold text-pink-700">
                      {hotSeat.name}
                    </span>
                  </p>
                )}
              </div>
              <Countdown
                deadline={
                  phase === "collectingAnswers"
                    ? room.timers.answerDeadline
                    : phase === "voting"
                      ? room.timers.voteDeadline
                      : phase === "showingResults"
                        ? room.timers.revealDeadline
                        : undefined
                }
                label={phase === "showingResults" ? "Next round" : "Time left"}
              />
            </div>

        {phase === "collectingAnswers" && flowStep === "answering" && (
          <div className="space-y-3">
            {me && (
              <form onSubmit={handleSubmitAnswer} className="space-y-3">
                <textarea
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                  rows={4}
                  placeholder={me.isHotSeat ? "Reveal the real answer..." : "Invent a fake answer..."}
                  disabled={submitting || hasSubmittedAnswer}
                  value={hasSubmittedAnswer ? mySubmission?.text ?? "" : answer}
                  readOnly={hasSubmittedAnswer}
                  onChange={(event) => setAnswer(event.target.value)}
                  maxLength={160}
                />
                <button
                  type="submit"
                  disabled={!answer.trim() || submitting || hasSubmittedAnswer}
                  className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:bg-indigo-300"
                >
                  {hasSubmittedAnswer ? "Answer locked" : me.isHotSeat ? "Submit real answer" : "Lock in bluff"}
                </button>
                {hasSubmittedAnswer && (
                  <p className="text-sm font-medium text-emerald-600">
                    {me.isHotSeat ? "Real answer received. Waiting on other players..." : "Bluff locked in!"}
                  </p>
                )}
              </form>
            )}
            {canVeto && (
              <button
                type="button"
                onClick={handleVeto}
                disabled={submitting}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow hover:bg-slate-50 disabled:bg-slate-100"
              >
                Veto question
              </button>
            )}
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">
              {waitingForAnswers.length === 0
                ? "All answers locked in!"
                : `Waiting for ${waitingForAnswers.length} player${waitingForAnswers.length === 1 ? "" : "s"}...`}
            </div>
          </div>
        )}

        {phase === "voting" && flowStep === "voting" && me && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Pick the real answer. No voting for yourself!</p>
            <div className="space-y-3">
              {currentRound.submissions.map((submission) => (
                <button
                  key={submission.playerId}
                  type="button"
                  disabled={Boolean(myVote) || me?.isHotSeat || submission.playerId === me?.id || submitting}
                  onClick={() => handleVote(submission.playerId)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-base transition ${
                    myVote?.submissionPlayerId === submission.playerId
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border-slate-200 bg-slate-50 text-slate-800 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white"
                  }`}
                >
                  {submission.text}
                  {submission.playerId === me?.id && (
                    <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-slate-400">(you)</span>
                  )}
                </button>
              ))}
            </div>
            {me?.isHotSeat && (
              <div className="rounded-2xl bg-pink-50 px-4 py-3 text-sm font-medium text-pink-700">
                Hot seat players observe this round – no voting for you.
              </div>
            )}
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">
              {waitingForVotes.length === 0
                ? "All votes are in!"
                : `Waiting for ${waitingForVotes.length} player${waitingForVotes.length === 1 ? "" : "s"}...`}
            </div>
          </div>
        )}

        {phase === "reviewAnswers" && <div />}

        {phase === "showingResults" && flowStep === "scoreboard" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Scores updated!</p>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-semibold text-slate-800">
              Check the scoreboard for the updated standings.
            </div>
          </div>
        )}

        {phase === "showingResults" && flowStep === "recap" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Here&apos;s how the bluff went down.</p>
            <div className="space-y-3">
              {currentRound.submissions.map((submission) => {
                const submissionOwner = room.players.find((p) => p.id === submission.playerId);
                const votes = submissionMap.get(submission.playerId) ?? 0;
                const isReal = submission.isRealAnswer;
                const voters = votersBySubmission.get(submission.playerId) ?? [];
                const isMostConvincing = submission.playerId === mostConvincingId;
                return (
                  <div
                    key={submission.playerId}
                    className={`rounded-2xl border px-4 py-3 ${
                      isReal ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <p className="text-base font-semibold text-slate-900">{submission.text}</p>
                    <p className="text-sm text-slate-500">
                      {isReal ? "Real answer" : "Fake answer"} by {submissionOwner?.name ?? "???"} · {votes} vote
                      {votes === 1 ? "" : "s"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {voters.length > 0 ? `Voted by ${voters.join(", ")}` : "No votes"}
                    </p>
                    {!isReal && isMostConvincing && (
                      <span className="mt-2 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                        Most Convincing Fake Answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {isHost ? (
              <button
                type="button"
                onClick={handleAdvanceRound}
                disabled={submitting}
                className={`w-full rounded-2xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:bg-indigo-300 focus-visible:ring-2 focus-visible:ring-offset-2 ${theme.focusRing}`}
              >
                {isFinalRound ? "Show final summary" : "Next question"}
              </button>
            ) : (
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600">
                Waiting for the host to continue...
              </div>
            )}
          </div>
        )}
      </div>

          <aside className="flex w-full flex-col gap-4 rounded-3xl bg-white/90 p-6 shadow-2xl shadow-slate-200 backdrop-blur md:w-80">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Scoreboard</p>
            {showScoreboard ? (
              <ol className="space-y-3">
                {[...room.players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => {
                    const hasAnswered = submittedIds.has(player.id);
                    const hasVoted = voteIds.has(player.id);
                    const showStatus = showAnswerStatus || showVoteStatus;
                    const statusLabel = showAnswerStatus
                      ? hasAnswered
                        ? "✔"
                        : "…"
                      : showVoteStatus
                        ? player.isHotSeat
                          ? "—"
                          : hasVoted
                            ? "✔"
                            : "…"
                        : "";
                    const statusTone = showAnswerStatus
                      ? hasAnswered
                        ? "text-emerald-600"
                        : "text-slate-400"
                      : showVoteStatus
                        ? player.isHotSeat || hasVoted
                          ? "text-emerald-600"
                          : "text-slate-400"
                        : "text-slate-400";
                    return (
                      <li
                        key={player.id}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                          player.id === me?.id ? "border-indigo-300 bg-indigo-50" : "border-slate-100 bg-slate-50"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <span>
                              {index + 1}. {player.name}
                            </span>
                            {showStatus && <span className={`text-xs font-bold ${statusTone}`}>{statusLabel}</span>}
                          </div>
                          <p className="text-xs text-slate-500">
                            🎯 {player.numCorrectGuesses} · 🃏 {player.numPeopleTricked}
                          </p>
                        </div>
                        <span className="text-lg font-black text-slate-900">{player.score}</span>
                      </li>
                    );
                  })}
              </ol>
            ) : (
              <div className="rounded-2xl bg-slate-100 px-4 py-6 text-center text-sm font-medium text-slate-600">
                Scores updating...
              </div>
            )}
          </aside>
        </div>
      </ScreenFade>

      {interstitial && (
        <PhaseInterstitial
          title={interstitial.title}
          subtitle={interstitial.subtitle}
          countdownSeconds={interstitial.countdownSeconds}
          countdownKey={countdownKey}
          onCountdownComplete={handleInterstitialComplete}
        />
      )}

      {spotlightActive && (
        <>
          <div
            className={`pointer-events-none absolute inset-0 z-10 bg-black transition-opacity duration-200 ${overlayOpacity}`}
          />
          <div className={`pointer-events-none absolute inset-0 z-10 spotlight-vignette ${vignetteOpacity}`} />
        </>
      )}

      {flowStep === "review" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center gap-6 px-6 py-8">
          <div
            className={`mt-2 w-full max-w-4xl rounded-3xl border bg-white/90 px-6 py-4 text-center ${theme.promptBorder} ${theme.promptGlow}`}
          >
            <p className={`text-xs font-semibold uppercase tracking-[0.35em] ${theme.accentText}`}>Review prompt</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{spotlightPrompt}</p>
          </div>

          <div className="flex flex-1 items-center justify-center">
            {spotlightAnswer ? (
              <div
                className={`w-full max-w-2xl rounded-3xl border bg-white/95 px-8 py-6 text-center text-2xl font-semibold text-slate-900 shadow-2xl shadow-slate-900/20 ${theme.promptBorder} ${
                  spotlightVisible ? "spotlight-in" : "spotlight-out"
                }`}
              >
                {spotlightAnswer.text}
              </div>
            ) : (
              <div className="w-full max-w-xl rounded-3xl border border-white/40 bg-white/20 px-6 py-5 text-center text-base font-semibold text-slate-100">
                Waiting for the host to reveal the first answer...
              </div>
            )}
          </div>

          <div className="w-full max-w-md space-y-3">
            {isHost ? (
              <button
                type="button"
                onClick={handleReviewNext}
                disabled={submitting || !showNextAnswer}
                className={`w-full rounded-2xl bg-amber-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-amber-200 transition hover:bg-amber-400 disabled:bg-amber-200 focus-visible:ring-2 focus-visible:ring-offset-2 ${theme.focusRing}`}
              >
                Next answer
              </button>
            ) : (
              <div className="rounded-2xl bg-white/20 px-4 py-3 text-center text-sm font-medium text-slate-100">
                Host is reviewing answers...
              </div>
            )}
          </div>
        </div>
      )}

      {flowStep === "reveal" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 py-8 text-center">
          <div className={`w-full max-w-3xl rounded-3xl border bg-white/95 px-8 py-6 shadow-2xl ${theme.promptBorder} ${theme.promptGlow}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.35em] ${theme.accentText}`}>Real answer</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{realSubmission?.text ?? "—"}</p>
            <p className="mt-3 text-sm font-semibold text-slate-500">{spotlightPrompt}</p>
          </div>
        </div>
      )}

      {flowStep === "scoring" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 py-8 text-center">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200/70 bg-white/95 px-8 py-6 shadow-2xl shadow-slate-200/40">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Scoring</p>
            <p className="mt-2 text-2xl font-black text-slate-900">Points are flying!</p>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {room.players.map((player) => {
                const events = scorePops.filter((event) => event.playerId === player.id);
                return (
                  <div key={player.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">{player.name}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                      {events.length === 0 ? (
                        <span className="text-xs font-semibold text-slate-400">No points</span>
                      ) : (
                        events.map((event) => (
                          <ScorePop key={event.id} amount={event.amount} label={event.label} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function phaseLabel(state: RoomState["gameState"]) {
  switch (state) {
    case "collectingAnswers":
      return "Answer phase";
    case "reviewAnswers":
      return "Review answers";
    case "voting":
      return "Voting phase";
    case "showingResults":
      return "Results";
    default:
      return "Hot Seat";
  }
}
