import type { Player, RoomState } from "../types";

interface FinalSummaryProps {
  room: RoomState;
  me: Player | null;
  isHost: boolean;
  onPlayAgain: () => Promise<void>;
}

export function FinalSummary({ room, me, isHost, onPlayAgain }: FinalSummaryProps) {
  const leaderboard = [...room.players].sort((a, b) => b.score - a.score);
  const trickster = leaderboard.reduce((prev, current) =>
    current.numPeopleTricked > prev.numPeopleTricked ? current : prev,
  );
  const mindReader = leaderboard.reduce((prev, current) =>
    current.numCorrectGuesses > prev.numCorrectGuesses ? current : prev,
  );
  const fakePerson = leaderboard.reduce((prev, current) =>
    current.numCorrectGuesses < prev.numCorrectGuesses ? current : prev,
  );
  const mostKnown = resolveMostKnown(room);

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Game Over</p>
      <h2 className="text-4xl font-black text-slate-900">Final Summary</h2>
      <p className="text-base text-slate-500">Great storytelling! Here&apos;s how everyone did.</p>

      <div className="w-full rounded-3xl bg-white/90 p-6 shadow-2xl shadow-slate-200 backdrop-blur">
        <ol className="space-y-3">
          {leaderboard.map((player, index) => (
            <li
              key={player.id}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                player.id === me?.id ? "border-indigo-200 bg-indigo-50" : "border-slate-100 bg-slate-50"
              }`}
            >
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {index + 1}. {player.name}
                </p>
                <p className="text-sm text-slate-500">
                  Score {player.score} · 🎯 {player.numCorrectGuesses} correct · 🃏 {player.numPeopleTricked} tricked
                </p>
              </div>
              {index === 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                  Champion
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-2">
        <AwardCard title="Master Trickster" description="Most people fooled" player={trickster} />
        <AwardCard title="Mind Reader" description="Most correct guesses" player={mindReader} />
        <AwardCard title="Fakest Friend" description="Least correct guesses" player={fakePerson} />
        <AwardCard title="Most Known" description="Hot seat answers guessed most" player={mostKnown} />
      </div>

      {isHost && (
        <button
          type="button"
          onClick={() => onPlayAgain()}
          className="rounded-2xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500"
        >
          Play again with new rounds
        </button>
      )}
    </div>
  );
}

function AwardCard({
  title,
  description,
  player,
}: {
  title: string;
  description: string;
  player?: Player;
}) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/90 p-5 text-left shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="text-sm text-slate-500">{description}</p>
      <p className="mt-3 text-2xl font-black text-slate-900">{player?.name ?? "—"}</p>
    </div>
  );
}

function resolveMostKnown(room: RoomState): Player | undefined {
  const totals = new Map<string, number>();
  room.rounds.forEach((round) => {
    const realSubmission = round.submissions.find((submission) => submission.isRealAnswer);
    if (!realSubmission) return;
    const votesForReal = round.votes.filter((vote) => vote.submissionPlayerId === realSubmission.playerId).length;
    const current = totals.get(round.hotSeatPlayerId) ?? 0;
    totals.set(round.hotSeatPlayerId, current + votesForReal);
  });
  let best: Player | undefined;
  let bestVotes = -1;
  totals.forEach((count, playerId) => {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;
    if (count > bestVotes) {
      bestVotes = count;
      best = player;
    }
  });
  return best;
}
