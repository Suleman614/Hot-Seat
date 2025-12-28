import type { Player } from "../types";

interface PlayerListProps {
  players: Player[];
}

export function PlayerList({ players }: PlayerListProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="rounded-3xl bg-white/80 p-4 shadow-lg shadow-slate-200 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Players</p>
        <span className="text-xs text-slate-400">{players.length} joined</span>
      </div>
      <ul className="space-y-2">
        {sorted.map((player) => (
          <li
            key={player.id}
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm"
          >
            <div>
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                {player.name}
                {player.isHotSeat && (
                  <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-semibold text-pink-700">Hot Seat</span>
                )}
                {!player.connected && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    Offline
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                Score {player.score} · 🎯 {player.numCorrectGuesses} · 🃏 {player.numPeopleTricked}
              </div>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow">
              #{sorted.indexOf(player) + 1}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

