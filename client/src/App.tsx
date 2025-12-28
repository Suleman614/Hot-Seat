import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [musicOn, setMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    room,
    playerId,
    playerName,
    connectionStatus,
    lastError,
    reviewState,
    showNextAnswer,
    isHost,
    createRoom,
    joinRoom,
    startGame,
    submitAnswer,
    submitVote,
    reviewNext,
    advanceRound,
    endGame,
    vetoQuestion,
    updateSettings,
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

  const handleUpdateSettings = useCallback(
    async (settings: Parameters<typeof updateSettings>[0]) => {
      await updateSettings(settings);
    },
    [updateSettings],
  );

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

  const handleAdvanceRound = useCallback(async () => {
    await advanceRound();
  }, [advanceRound]);

  const handleReviewNext = useCallback(async () => {
    await reviewNext();
  }, [reviewNext]);

  const handleEndGame = useCallback(async () => {
    await endGame();
  }, [endGame]);

  const handleVetoQuestion = useCallback(async () => {
    await vetoQuestion();
  }, [vetoQuestion]);

  const resolveMusicTrack = () => {
    if (room?.gameState === "finalSummary") {
      return "/audio/Bleach%20Number%20one.mov";
    }
    return "/audio/wii-music.mp3";
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!musicOn) {
      audio.pause();
      return;
    }
    const nextSrc = resolveMusicTrack();
    if (!audio.src.endsWith(nextSrc)) {
      audio.src = nextSrc;
    }
    audio.loop = true;
    audio.volume = 0.2;
    void audio.play();
  }, [musicOn, room?.gameState]);

  const musicButton = (
    <button
      type="button"
      onClick={() => setMusicOn((prev) => !prev)}
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow hover:bg-slate-50"
    >
      {musicOn ? "Music: On" : "Music: Off"}
    </button>
  );

  if (!room) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute right-6 top-4 z-10">{musicButton}</div>
        <Landing
          mode={landingMode}
          onModeChange={handleModeChange}
          onCreate={handleCreate}
          onJoin={handleJoin}
          loading={loading}
          connectionStatus={connectionStatus}
          error={lastError}
        />
        <audio ref={audioRef} preload="auto" />
      </div>
    );
  }

  const backgroundClass = resolveBackgroundClass(room.gameState);

  return (
    <div className={`min-h-screen ${backgroundClass}`}>
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Hot Seat</p>
          <h1 className="text-2xl font-black text-slate-900">{room.gameState === "lobby" ? "Lobby" : "Live game"}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill label="Status" value={connectionStatus} />
          <StatusPill label="Room" value={room.code} />
          <StatusPill label="Player" value={playerName || me?.name || "You"} />
          {musicButton}
          {isHost && room.gameState !== "lobby" && room.gameState !== "finalSummary" && (
            <button
              type="button"
              onClick={() => handleEndGame()}
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 shadow hover:bg-rose-100"
            >
              End Game
            </button>
          )}
          <button
            type="button"
            onClick={() => leaveRoom()}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow hover:bg-slate-50"
          >
            Leave
          </button>
        </div>
      </header>

      {lastError && (
        <div className="mx-6 mb-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm font-medium text-rose-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{lastError}</span>
            <button
              type="button"
              onClick={() => resetError()}
              className="rounded-full bg-rose-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-rose-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {room.gameState === "lobby" && (
        <LobbyView
          room={room}
          isHost={isHost}
          onStartGame={() => handleStartGame()}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {["collectingAnswers", "reviewAnswers", "voting", "showingResults"].includes(room.gameState) && (
        <GameBoard
          room={room}
          me={me}
          isHost={isHost}
          onSubmitAnswer={handleSubmitAnswer}
          onSubmitVote={handleSubmitVote}
          onReviewNext={handleReviewNext}
          onAdvanceRound={handleAdvanceRound}
          onVetoQuestion={handleVetoQuestion}
          reviewState={reviewState}
          showNextAnswer={showNextAnswer}
        />
      )}

      {room.gameState === "finalSummary" && (
        <FinalSummary room={room} me={me} isHost={isHost} onPlayAgain={() => handleStartGame()} />
      )}
      <audio ref={audioRef} preload="auto" />
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

function resolveBackgroundClass(state: string) {
  switch (state) {
    case "lobby":
      return "bg-gradient-to-b from-sky-100 via-sky-50 to-white";
    case "collectingAnswers":
      return "bg-gradient-to-b from-amber-100 via-amber-50 to-white";
    case "reviewAnswers":
      return "bg-gradient-to-b from-amber-100 via-amber-50 to-white";
    case "voting":
      return "bg-gradient-to-b from-violet-100 via-violet-50 to-white";
    case "showingResults":
      return "bg-gradient-to-b from-rose-100 via-rose-50 to-white";
    case "finalSummary":
      return "bg-gradient-to-b from-amber-200 via-amber-50 to-white";
    default:
      return "bg-gradient-to-b from-slate-100 via-white to-slate-100";
  }
}
export default App;
