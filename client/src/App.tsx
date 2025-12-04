import { useCallback, useMemo, useState } from "react";
import { Landing } from "./components/Landing";
import { LobbyView } from "./components/LobbyView";
import { GameBoard } from "./components/GameBoard";
import { FinalSummary } from "./components/FinalSummary";
import { useGameClient } from "./hooks/useGameClient";
import type { LandingMode } from "./components/Landing";
import type { Player } from "./types";

function App() {
  const [landingMode, setLandingMode] = useState<LandingMode>("create");
  const [loading, setLoading] = useState(false);

  const {
    room,
    playerId,
    playerName,
    connectionStatus,
    lastError,
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    submitVote,
    leaveRoom,
    resetError,
  } = useGameClient();

  const me: Player | null = useMemo(
    () => room?.players.find((player) => player.id === playerId) ?? null,
    [room, playerId],
  );

  const handleCreate = useCallback(
    async (name: string) => {
      setLoading(true);
      const result = await createRoom(name);
      setLoading(false);
      if (!result.ok) return;
      setLandingMode("create");
    },
    [createRoom],
  );

  const handleJoin = useCallback(
    async (roomCode: string, name: string) => {
      setLoading(true);
      const result = await joinRoom(roomCode, name);
      setLoading(false);
      if (!result.ok) return;
      setLandingMode("join");
    },
    [joinRoom],
  );

  const handleModeChange = (mode: LandingMode) => {
    resetError();
    setLandingMode(mode);
  };

  const handleStartGame = useCallback(async () => {
    await startGame();
  }, [startGame]);

  const handleSubmitAnswer = useCallback(
    async (text: string) => {
      await submitAnswer(text);
    },
    [submitAnswer],
  );

  const handleSubmitVote = useCallback(
    async (submissionPlayerId: string) => {
      await submitVote(submissionPlayerId);
    },
    [submitVote],
  );

  if (!room) {
    return (
      <Landing
        mode={landingMode}
        onModeChange={handleModeChange}
        onCreate={handleCreate}
        onJoin={handleJoin}
        loading={loading}
        connectionStatus={connectionStatus}
        error={lastError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Hot Seat</p>
          <h1 className="text-2xl font-black text-slate-900">{room.gameState === "lobby" ? "Lobby" : "Live game"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill label="Status" value={connectionStatus} />
          <StatusPill label="Room" value={room.code} />
          <StatusPill label="Player" value={playerName || me?.name || "You"} />
          <button
            type="button"
            onClick={() => leaveRoom()}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow hover:bg-slate-50"
          >
            Leave
          </button>
        </div>
      </header>

      {room.gameState === "lobby" && (
        <LobbyView room={room} me={me} onStartGame={() => handleStartGame()} />
      )}

      {["collectingAnswers", "voting", "showingResults"].includes(room.gameState) && (
        <GameBoard room={room} me={me} onSubmitAnswer={handleSubmitAnswer} onSubmitVote={handleSubmitVote} />
      )}

      {room.gameState === "finalSummary" && (
        <FinalSummary room={room} me={me} onPlayAgain={() => handleStartGame()} />
      )}
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow">
      {label}: <span className="ml-1 text-slate-900">{value}</span>
    </div>
  );
}

export default App;
