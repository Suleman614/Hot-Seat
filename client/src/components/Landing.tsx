import { useState } from "react";
import type { FormEvent } from "react";

export type LandingMode = "landing" | "create" | "join";

interface LandingProps {
  mode: LandingMode;
  onModeChange: (mode: LandingMode) => void;
  onCreate: (name: string) => Promise<void>;
  onJoin: (roomCode: string, name: string) => Promise<void>;
  loading: boolean;
  connectionStatus: string;
  error?: string | null;
}

export function Landing({
  mode,
  onModeChange,
  onCreate,
  onJoin,
  loading,
  connectionStatus,
  error,
}: LandingProps) {
  const [createName, setCreateName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!createName.trim()) return;
    await onCreate(createName.trim());
  };

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    if (!joinName.trim() || !joinCode.trim()) return;
    await onJoin(joinCode.trim().toUpperCase(), joinName.trim());
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Party Game</p>
        <h1 className="mt-2 text-4xl font-black text-slate-900 md:text-5xl">Hot Seat</h1>
        <p className="mt-3 text-base text-slate-600">
          Jump into the digital version of the classic party game. Bluff, guess, and laugh with your favorite people.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 rounded-3xl bg-white/80 p-6 shadow-2xl shadow-slate-200 backdrop-blur-lg">
        <button
          className={`flex-1 rounded-2xl border-2 px-6 py-4 text-left transition hover:-translate-y-0.5 ${
            mode === "create" ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"
          }`}
          onClick={() => onModeChange("create")}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">Host a room</p>
          <p className="text-lg font-bold text-slate-900">Create Room</p>
          <p className="text-sm text-slate-500">Generate a code and invite friends.</p>
        </button>
        <button
          className={`flex-1 rounded-2xl border-2 px-6 py-4 text-left transition hover:-translate-y-0.5 ${
            mode === "join" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
          }`}
          onClick={() => onModeChange("join")}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Hop in</p>
          <p className="text-lg font-bold text-slate-900">Join Room</p>
          <p className="text-sm text-slate-500">Enter the code your host shared.</p>
        </button>
      </div>

      <div className="mt-6 w-full rounded-3xl bg-white/80 p-6 shadow-2xl shadow-slate-200 backdrop-blur-lg">
        {mode === "create" && (
          <form className="space-y-4" onSubmit={handleCreate}>
            <label className="block text-sm font-semibold text-slate-600">
              Display name
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Ex. Captain Kahoot"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:bg-indigo-300"
            >
              {loading ? "Creating..." : "Create Room"}
            </button>
          </form>
        )}

        {mode === "join" && (
          <form className="space-y-4" onSubmit={handleJoin}>
            <label className="block text-sm font-semibold text-slate-600">
              Display name
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-base text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="Ex. Trivia Legend"
                value={joinName}
                onChange={(event) => setJoinName(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-semibold text-slate-600">
              Room code
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-base uppercase tracking-[0.3em] text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                placeholder="ABCD"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                maxLength={6}
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-500 disabled:bg-emerald-300"
            >
              {loading ? "Joining..." : "Join Room"}
            </button>
          </form>
        )}

        {error && <p className="mt-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}

        <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
          <span>Connection: {connectionStatus}</span>
          <span>Need at least 3 players to start</span>
        </div>
      </div>
    </div>
  );
}


