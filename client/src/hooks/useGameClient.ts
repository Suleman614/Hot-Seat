import { useCallback, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ActionResult, RoomState } from "../types";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

type RequestPayload = Record<string, unknown>;

export interface GameClient {
  room: RoomState | null;
  playerId: string | null;
  playerName: string;
  connectionStatus: "connecting" | "connected" | "disconnected";
  lastError: string | null;
  createRoom: (name: string) => Promise<ActionResult>;
  joinRoom: (roomCode: string, name: string) => Promise<ActionResult>;
  startGame: () => Promise<ActionResult>;
  submitAnswer: (text: string) => Promise<ActionResult>;
  submitVote: (submissionPlayerId: string) => Promise<ActionResult>;
  updateSettings: (settings: Partial<RoomState["settings"]>) => Promise<ActionResult>;
  leaveRoom: () => void;
  resetError: () => void;
}

export function useGameClient(): GameClient {
  const [socket] = useState<Socket>(() =>
    io(SERVER_URL, {
      autoConnect: false,
      transports: ["websocket"],
    }),
  );
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket.connected) {
      setConnectionStatus("connecting");
      socket.connect();
    }

    const handleRoomUpdate = (nextRoom: RoomState) => {
      setRoom(nextRoom);
      if (playerName) {
        const me = nextRoom.players.find((p) => p.name === playerName);
        if (me) {
          setPlayerId(me.id);
        }
      }
    };

    socket.on("connect", () => setConnectionStatus("connected"));
    socket.on("disconnect", () => setConnectionStatus("disconnected"));
    socket.on("roomUpdated", handleRoomUpdate);

    return () => {
      socket.off("roomUpdated", handleRoomUpdate);
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [socket, playerName]);

  const emitRequest = useCallback(
    async (event: string, payload?: RequestPayload): Promise<ActionResult> => {
      return new Promise((resolve) => {
        socket.emit(event, payload ?? {}, (response: ActionResult) => {
          if (!response.ok) {
            setLastError(response.error ?? "Something went wrong");
          }
          resolve(response);
        });
      });
    },
    [socket],
  );

  const identifyPlayer = useCallback(
    (nextRoom: RoomState | null, name: string): string | null => {
      if (!nextRoom) return null;
      const player = nextRoom.players.find((p) => p.name === name);
      return player?.id ?? null;
    },
    [],
  );

  const createRoom = useCallback(
    async (name: string) => {
      setPlayerName(name);
      const response = await emitRequest("createRoom", { name });
      if (response.ok && response.room) {
        setRoom(response.room);
        setPlayerId(identifyPlayer(response.room, name));
      }
      return response;
    },
    [emitRequest, identifyPlayer],
  );

  const joinRoom = useCallback(
    async (roomCode: string, name: string) => {
      setPlayerName(name);
      const response = await emitRequest("joinRoom", { roomCode, name });
      if (response.ok && response.room) {
        setRoom(response.room);
        setPlayerId(identifyPlayer(response.room, name));
      }
      return response;
    },
    [emitRequest, identifyPlayer],
  );

  const startGame = useCallback(async () => emitRequest("startGame"), [emitRequest]);
  const submitAnswer = useCallback(
    async (text: string) => emitRequest("submitAnswer", { text }),
    [emitRequest],
  );
  const submitVote = useCallback(
    async (submissionPlayerId: string) => emitRequest("submitVote", { submissionPlayerId }),
    [emitRequest],
  );
  const updateSettings = useCallback(
    async (settings: Partial<RoomState["settings"]>) => emitRequest("updateSettings", settings),
    [emitRequest],
  );

  const leaveRoom = useCallback(() => {
    if (room) {
      socket.emit("leaveRoom");
    }
    setRoom(null);
    setPlayerId(null);
  }, [room, socket]);

  const resetError = useCallback(() => setLastError(null), []);

  return useMemo(
    () => ({
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
      updateSettings,
      leaveRoom,
      resetError,
    }),
    [
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
      updateSettings,
      leaveRoom,
      resetError,
    ],
  );
}


