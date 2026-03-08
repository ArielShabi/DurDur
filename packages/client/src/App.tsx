import { useState } from "react";
import { useGame } from "./context/GameContext";
import { Lobby } from "./components/Lobby";
import { Game } from "./components/Game";

function App() {
  const { room, reconnecting, joinOrCreate, error } = useGame();
  const [playerName, setPlayerName] = useState("");

  const state = room?.state;
  const showGame = room && state && state.currentPhase !== "waiting";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-amber-400">Durak</h1>
        <p className="text-slate-400 mt-1">Real-time multiplayer</p>
      </header>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-900/50 text-red-200 text-sm">
          {error}
        </div>
      )}

      {reconnecting ? (
        <p className="text-slate-400 text-sm">Reconnecting to your game...</p>
      ) : !room ? (
        <section className="space-y-4 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500"
            />
            <button
              type="button"
              onClick={() => joinOrCreate(playerName || undefined)}
              className="px-4 py-2 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-500"
            >
              Join game
            </button>
          </div>
        </section>
      ) : showGame ? (
        <Game />
      ) : (
        <Lobby />
      )}
    </div>
  );
}

export default App;
