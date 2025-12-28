import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { RoomManager } from "./roomManager";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "*";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

const rooms = new RoomManager(io);

io.on("connection", (socket) => {
  socket.on("createRoom", (payload: { name: string }, callback) => {
    try {
      const roomState = rooms.createRoom(payload.name, socket);
      if (typeof callback === "function") {
        callback({ ok: true, room: roomState });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to create room",
        });
      }
    }
  });

  socket.on("joinRoom", (payload: { name: string; roomCode: string }, callback) => {
    try {
      const roomState = rooms.joinRoom(payload.roomCode, payload.name, socket);
      if (typeof callback === "function") {
        callback({ ok: true, room: roomState });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to join room",
        });
      }
    }
  });

  socket.on("reconnectPlayer", (payload: { playerId: string }, callback) => {
    try {
      const roomState = rooms.reconnectPlayer(payload.playerId, socket);
      if (!roomState) {
        throw new Error("Player not found");
      }
      if (typeof callback === "function") {
        callback({ ok: true, room: roomState });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to reconnect",
        });
      }
    }
  });

  socket.on("startGame", (callback) => {
    try {
      rooms.startGame(socket.id);
      if (typeof callback === "function") {
        callback({ ok: true });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to start game",
        });
      }
    }
  });

  socket.on("submitAnswer", (payload: { text: string }, callback) => {
    try {
      rooms.submitAnswer(socket.id, payload.text);
      if (typeof callback === "function") {
        callback({ ok: true });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to submit answer",
        });
      }
    }
  });

  socket.on("submitVote", (payload: { submissionPlayerId: string }, callback) => {
    try {
      rooms.submitVote(socket.id, payload.submissionPlayerId);
      if (typeof callback === "function") {
        callback({ ok: true });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to submit vote",
        });
      }
    }
  });

  socket.on("updateSettings", (payload, callback) => {
    try {
      rooms.updateSettings(socket.id, payload);
      if (typeof callback === "function") {
        callback({ ok: true });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to update settings",
        });
      }
    }
  });

  socket.on("endGame", (callback) => {
    try {
      rooms.endGame(socket.id);
      if (typeof callback === "function") {
        callback({ ok: true });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to end game",
        });
      }
    }
  });

  socket.on("vetoQuestion", (callback) => {
    try {
      rooms.vetoQuestion(socket.id);
      if (typeof callback === "function") {
        callback({ ok: true });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to veto question",
        });
      }
    }
  });

  socket.on("advanceRound", (callback) => {
    try {
      rooms.advanceRoundFromHost(socket.id);
      if (typeof callback === "function") {
        callback({ ok: true });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to advance round",
        });
      }
    }
  });

  socket.on("reviewNext", (callback) => {
    try {
      rooms.reviewNext(socket.id);
      if (typeof callback === "function") {
        callback({ ok: true });
      }
    } catch (error) {
      if (typeof callback === "function") {
        callback({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to review next answer",
        });
      }
    }
  });

  socket.on("requestRoomState", (payload: { roomCode: string }, callback) => {
    const room = rooms.getRoomByCode(payload.roomCode);
    if (typeof callback === "function") {
      callback({ ok: Boolean(room), room });
    }
  });

  socket.on("leaveRoom", () => {
    rooms.leaveRoom(socket.id);
    const roomsToLeave = Array.from(socket.rooms);
    roomsToLeave.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.leave(roomId);
      }
    });
  });

  socket.on("disconnect", () => {
    rooms.leaveRoom(socket.id);
  });
});

server.listen(PORT, () => {
  /* eslint-disable no-console */
  console.log(`Hot Seat server listening on port ${PORT}`);
});
