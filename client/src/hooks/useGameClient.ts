import { useCallback, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ActionResult, RoomState } from "../types";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";
const STORAGE_KEY = "hotseat-session";

type RequestPayload = Record<string, unknown>;

type StoredSession = {
  playerId: string;
  playerName: string;
  roomCode: string;
};

const loadSession = (): StoredSession | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.playerId || !parsed.playerName || !parsed.roomCode) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveSession = (session: StoredSession | null) => {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

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
  advanceRound: () => Promise<ActionResult>;
  endGame: () => Promise<ActionResult>;
  updateSettings: (settings: Partial<RoomState["settings"]>) => Promise<ActionResult>;
  leaveRoom: () => void;
  resetError: () => void;
}

export function useGameClient(): GameClient {
  const [socket] = useState<Socket>(() =>
    io(SERVER_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    }),
  );
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  const [lastError, setLastError] = useState<string | null>(null);
  const [hasAttemptedReconnect, setHasAttemptedReconnect] = useState(false);
  const [reconnectPending, setReconnectPending] = useState(false);

  const emitRequest = useCallback(
    async (event: string, payload?: RequestPayload): Promise<ActionResult> => {
      return new Promise((resolve) => {
        const handleResponse = (response: ActionResult) => {
          if (!response.ok) {
            setLastError(response.error ?? "Something went wrong");
          } else if (lastError) {
            setLastError(null);
          }
          resolve(response);
        };

        if (typeof payload === "undefined") {
          socket.emit(event, handleResponse);
          return;
        }

        socket.emit(event, payload, handleResponse);
      });
    },
    [socket, lastError],
  );

  useEffect(() => {
    const handleRoomUpdate = (nextRoom: RoomState) => {
      setRoom(nextRoom);
      if (playerId) {
        const me = nextRoom.players.find((p) => p.id === playerId);
        if (me) {
          setPlayerName(me.name);
          return;
        }
      }
      if (playerName) {
        const me = nextRoom.players.find((p) => p.name === playerName);
        if (me) {
          setPlayerId(me.id);
        }
      }
    };

    const handleConnect = () => {
      setConnectionStatus("connected");
      setHasAttemptedReconnect(false);
    };
    const handleDisconnect = () => {
      setConnectionStatus("disconnected");
      setHasAttemptedReconnect(false);
      setReconnectPending(true);
    };
    const handleReconnectAttempt = () => {
      setConnectionStatus("connecting");
    };
    const handleConnectError = () => {
      setConnectionStatus("disconnected");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("reconnect_attempt", handleReconnectAttempt);
    socket.on("connect_error", handleConnectError);
    socket.on("roomUpdated", handleRoomUpdate);

    if (socket.connected) {
      setConnectionStatus("connected");
    } else {
      setConnectionStatus("connecting");
      socket.connect();
    }

    return () => {
      socket.off("roomUpdated", handleRoomUpdate);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("reconnect_attempt", handleReconnectAttempt);
      socket.off("connect_error", handleConnectError);
    };
  }, [socket, playerName, playerId]);

  useEffect(() => {
    if (connectionStatus !== "connected" || !reconnectPending || !playerId) {
      return;
    }
    void emitRequest("reconnectPlayer", { playerId }).then((response) => {
      setReconnectPending(false);
      if (response.ok && response.room) {
        setRoom(response.room);
        const resolvedName =
          response.room.players.find((player) => player.id === playerId)?.name ?? playerName;
        setPlayerName(resolvedName);
        saveSession({ playerId, playerName: resolvedName, roomCode: response.room.code });
        return;
      }
      if (room) {
        setLastError("Connection lost. Unable to rejoin the room.");
        return;
      }
      setRoom(null);
      setPlayerId(null);
      saveSession(null);
    });
  }, [connectionStatus, reconnectPending, playerId, playerName, emitRequest, room]);

  useEffect(() => {
    if (connectionStatus !== "connected" || room || hasAttemptedReconnect) {
      return;
    }
    const session = loadSession();
    if (!session) {
      return;
    }
    setHasAttemptedReconnect(true);
    setPlayerName(session.playerName);
    void emitRequest("reconnectPlayer", { playerId: session.playerId }).then((response) => {
      if (response.ok && response.room) {
        setRoom(response.room);
        setPlayerId(session.playerId);
        saveSession({ ...session, roomCode: response.room.code });
        return;
      }
      saveSession(null);
    });
  }, [connectionStatus, room, hasAttemptedReconnect, emitRequest]);

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
        const nextPlayerId = identifyPlayer(response.room, name);
        setPlayerId(nextPlayerId);
        if (nextPlayerId) {
          saveSession({ playerId: nextPlayerId, playerName: name, roomCode: response.room.code });
        }
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
        const nextPlayerId = identifyPlayer(response.room, name);
        setPlayerId(nextPlayerId);
        if (nextPlayerId) {
          saveSession({ playerId: nextPlayerId, playerName: name, roomCode: response.room.code });
        }
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
  const advanceRound = useCallback(async () => emitRequest("advanceRound"), [emitRequest]);
  const endGame = useCallback(async () => emitRequest("endGame"), [emitRequest]);
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
    saveSession(null);
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
      advanceRound,
      endGame,
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
      advanceRound,
      endGame,
      updateSettings,
      leaveRoom,
      resetError,
    ],
  );
}
