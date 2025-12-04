import type { Player, RoomState } from "../types";
import { PlayerList } from "./PlayerList";

interface LobbyViewProps {
  room: RoomState;
  me: Player | null;
  onStartGame: () => Promise<void>;
}

export function LobbyView({ room, me, onStartGame }: LobbyViewProps) {
  const canStart = Boolean(me?.isHost) && room.players.filter((p) => p.connected).length >= 3;

  const handleStart = () => {
    if (!canStart) return;
    void onStartGame();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-10 md:flex-row">
      <div className="flex-1 rounded-3xl bg-white/90 p-6 shadow-2xl shadow-slate-200 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Room code</p>
            <div className="mt-1 flex items-center gap-2 text-4xl font-black tracking-[0.4em] text-slate-900">
              {room.code}
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow"
                onClick={() => navigator.clipboard.writeText(room.code)}
              >
                Copy
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Share this code with friends. Host: {room.players.find((p) => p.isHost)?.name}
            </p>
          </div>
          {me?.isHost && (
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              className="rounded-2xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:bg-indigo-300"
            >
              {canStart ? "Start Game" : "Need 3+ players"}
            </button>
          )}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/80 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <SettingCard label="Rounds" value={room.settings.maxRounds.toString()} />
            <SettingCard label="Answer time" value={`${room.settings.secondsToAnswer}s`} />
            <SettingCard label="Voting time" value={`${room.settings.secondsToVote}s`} />
          </div>
        </div>
      </div>
      <div className="flex-1">
        <PlayerList players={room.players} />
      </div>
    </div>
  );
}

function SettingCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 px-4 py-3 text-center shadow">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}


