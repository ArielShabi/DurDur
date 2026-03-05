# Durak – Real-time multiplayer (boilerplate)

Monorepo for a Colyseus-backed Durak card game: **packages/server** (Node + Express + Colyseus) and **packages/client** (React + Vite + Tailwind).

## Prerequisites

- Node.js 18+
- npm (or pnpm/yarn)

## Setup

From the repo root:

```bash
npm install
```

## Run

**Terminal 1 – server (Colyseus + Express):**

```bash
npm run dev:server
```

- WebSocket server: `ws://localhost:2567`
- Monitor UI: http://localhost:2567/monitor

**Terminal 2 – client (React + Vite):**

```bash
npm run dev:client
```

- App: http://localhost:5173

Or run both with:

```bash
npm run dev
```

## Usage

1. Open the client in the browser.
2. Click **Connect** to create the Colyseus client (ws://localhost:2567).
3. Enter a name (optional) and click **Join game** to join or create a `durak` room.
4. The UI shows: player count, phase, deck size, trump card, table cards, and your hand (all driven by the room state).

## Structure

- **packages/server**
  - Express app with Colyseus `Server` and `/monitor`.
  - `DurakRoom` with `onJoin` / `onLeave`.
  - Schema: `Card`, `Player`, `GameState` (players map, deck, trumpCard, table, currentPhase).
- **packages/client**
  - React app with `GameProvider` / `useGame()` for Colyseus client and room.
  - Same schema types for typed `room.state`.
  - UI: connect, join/leave, and placeholders for hand, deck, trump, table.

## Tech stack

- **Server:** Node.js, Express, TypeScript, Colyseus, @colyseus/monitor.
- **Client:** React (Vite), TypeScript, Tailwind CSS, colyseus.js.
