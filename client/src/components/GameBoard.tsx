import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Countdown } from "./Countdown";
import type { Player, RoomState } from "../types";

interface GameBoardProps {
  room: RoomState;
  me: Player | null;
  onSubmitAnswer: (text: string) => Promise<void>;
  onSubmitVote: (submissionPlayerId: string) => Promise<void>;
}

export function GameBoard({ room, me, onSubmitAnswer, onSubmitVote }: GameBoardProps) {
  const [answer, setAnswer] = useState("");
  const currentRound = room.rounds[room.currentRoundIndex];
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    setAnswer("");
    setSubmitting(false);
  }, [currentRound?.id]);

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
    setSubmitting(false);
  };

  const handleVote = async (submissionPlayerId: string) => {
    if (me?.isHotSeat || myVote || submissionPlayerId === me?.id) {
      return;
    }
    setSubmitting(true);
    await onSubmitVote(submissionPlayerId);
    setSubmitting(false);
  };

  const phase = room.gameState;

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10 md:flex-row">
      <div className="flex-1 space-y-4 rounded-3xl bg-white/90 p-6 shadow-2xl shadow-slate-200 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{phaseLabel(phase)}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{currentRound.question}</h2>
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

        {phase === "collectingAnswers" && me && (
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

        {phase === "voting" && (
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
          </div>
        )}

        {phase === "showingResults" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Here&apos;s how the bluff went down.</p>
            <div className="space-y-3">
              {currentRound.submissions.map((submission) => {
                const submissionOwner = room.players.find((p) => p.id === submission.playerId);
                const votes = submissionMap.get(submission.playerId) ?? 0;
                const isReal = submission.isRealAnswer;
                return (
                  <div
                    key={submission.playerId}
                    className={`rounded-2xl border px-4 py-3 ${isReal ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"}`}
                  >
                    <p className="text-base font-semibold text-slate-900">{submission.text}</p>
                    <p className="text-sm text-slate-500">
                      {isReal ? "Real answer" : "Fake answer"} by {submissionOwner?.name ?? "???"} · {votes} vote
                      {votes === 1 ? "" : "s"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <aside className="flex w-full flex-col gap-4 rounded-3xl bg-white/90 p-6 shadow-2xl shadow-slate-200 backdrop-blur md:w-80">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Scoreboard</p>
        <ol className="space-y-3">
          {[...room.players]
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <li
                key={player.id}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                  player.id === me?.id ? "border-indigo-300 bg-indigo-50" : "border-slate-100 bg-slate-50"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {index + 1}. {player.name}
                  </p>
                  <p className="text-xs text-slate-500">🎯 {player.numCorrectGuesses} · 🃏 {player.numPeopleTricked}</p>
                </div>
                <span className="text-lg font-black text-slate-900">{player.score}</span>
              </li>
            ))}
        </ol>
      </aside>
    </div>
  );
}

function phaseLabel(state: RoomState["gameState"]) {
  switch (state) {
    case "collectingAnswers":
      return "Answer phase";
    case "voting":
      return "Voting phase";
    case "showingResults":
      return "Results";
    default:
      return "Hot Seat";
  }
}
