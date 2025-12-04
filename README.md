# Sule inpsired Hot Seat – Real-Time Party Game

Hot Seat is a full-stack TypeScript web app that lets friends jump into a bluffing party game with live rooms, rotating hot-seat rounds, and real-time scoring similar to a Kahoot session.

## Tech Stack

- **Frontend:** React 19 + Vite, TypeScript, Tailwind CSS, Socket.IO client
- **Backend:** Node.js + Express, Socket.IO, TypeScript
- **State:** In-memory room store designed to be swapped with a database later

## Getting Started

```bash
git clone <repo>
cd "Hot Seat"
```

### 1. Backend

```bash
cd server
npm install
npm run dev
```

Environment variables (optional):

| Name            | Default             | Description                                      |
| --------------- | ------------------- | ------------------------------------------------ |
| `PORT`          | `4000`              | Socket/HTTP port                                 |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin for Socket.IO                |
| `MIN_PLAYERS`   | `3`                 | Minimum connected players required to start (≥2) |

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Create a `.env` file inside `client` to point to the server if you change the backend host:

```
VITE_SERVER_URL=http://localhost:4000
VITE_MIN_PLAYERS=3
```

### Quick two-device testing

If you only have two devices available, lower the threshold temporarily:

1. Backend: start/dev with `MIN_PLAYERS=2 npm run dev` (or set the env var in your hosting platform).
2. Frontend: set `VITE_MIN_PLAYERS=2` in `client/.env` and rerun `npm run dev` (or redeploy).

Leave both values at `3` for live party sessions so the full bluff/voting loop works as intended.

### 3. Production Build

```bash
cd server && npm run build
cd ../client && npm run build
```

Serve `client/dist` with any static host and run `node dist/index.js` inside `server`.

## Gameplay Overview

1. Host creates a room and shares the generated code.
2. Players join the lobby (at least 3 required). Host can tweak timer lengths and round counts.
3. Each round assigns a rotating hot seat and a random question.
4. Hot seat submits the real answer while everyone else submits decoys.
5. Voting phase: everyone except the hot seat guesses the real answer (cannot vote for themselves).
6. Results are revealed live, scores update, and the next round starts automatically.
7. After all rounds the Final Summary shows the leaderboard plus awards:
   - **Master Trickster:** most people tricked
   - **Mind Reader:** most correct guesses

## Notable Features

- Socket.IO rooms broadcast every state change (joins, submissions, votes, scoring, disconnects).
- Phase timers run server-side and are mirrored on the client with countdown badges.
- Disconnect handling removes players in the lobby and marks them inactive mid-game; hot seat drops instantly advance the round.
- In-memory room manager is isolated so it can later be swapped with a persistent store.
- Tailwind-powered responsive UI optimised for mobile and tablets.

## Folder Structure

```
server/            # Express + Socket.IO backend (TypeScript)
  src/
    index.ts       # HTTP + socket bootstrap
    roomManager.ts # Room + round logic, scoring, timers
    types.ts       # Shared backend models
    questions.ts   # Question bank + shuffler
client/            # React frontend (Vite)
  src/
    components/    # Landing, lobby, game board, summary, etc.
    hooks/         # Socket-powered game client hook
    types.ts       # Frontend models mirroring the backend payloads
README.md          # You are here
```

## Testing Tips

- Run both `npm run dev` scripts and open two browser windows to simulate multiple players.
- Use the browser devtools network tab to watch Socket.IO events when debugging.
- If you adjust timers or scoring, restart the server to refresh the in-memory state.

Enjoy roasting your friends in the Hot Seat!


