import { useState } from "react";
import { useGame } from "./context/GameContext";
import { Lobby } from "./components/Lobby";
import { Game } from "./components/Game";

function App() {
  const { room, reconnecting, joining, connectionLost, createRoom, joinRoom, error } =
    useGame();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState(
    () => new URLSearchParams(window.location.search).get("code") ?? "",
  );
  const [mode, setMode] = useState<"menu" | "join">(
    () => (new URLSearchParams(window.location.search).get("code") ? "join" : "menu"),
  );

  const state = room?.state;
  const showGame = room && state && state.currentPhase !== "waiting";

  const handleCreate = () => createRoom(playerName || undefined);
  const handleJoin = () => {
    if (!roomCode.trim()) return;
    joinRoom(roomCode.trim(), playerName || undefined);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-amber-400 text-center">
          Dur Dur
        </h1>
      </header>

      {connectionLost && (
        <div className="mb-4 p-3 rounded bg-amber-900/50 text-amber-200 text-sm text-center animate-pulse">
          Connection lost — attempting to reconnect...
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded bg-red-900/50 text-red-200 text-sm max-w-md mx-auto">
          {error}
        </div>
      )}

      {reconnecting ? (
        <p className="text-slate-400 text-sm text-center">
          Reconnecting to your game...
        </p>
      ) : !room ? (
        <section className="max-w-sm mx-auto space-y-6">
          <input
            type="text"
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={joining}
            className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 disabled:opacity-50"
          />

          {mode === "menu" ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleCreate}
                disabled={joining}
                className="w-full px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {joining ? "Creating room..." : "Create Room"}
              </button>
              <button
                type="button"
                onClick={() => setMode("join")}
                disabled={joining}
                className="w-full px-6 py-3 rounded-lg bg-slate-700 text-slate-200 font-semibold text-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Join Room
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  disabled={joining}
                  className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 uppercase tracking-widest text-center text-lg font-mono disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining || roomCode.trim().length < 4}
                className="w-full px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {joining ? "Joining..." : "Join"}
              </button>
              <button
                type="button"
                onClick={() => setMode("menu")}
                disabled={joining}
                className="w-full px-4 py-2 rounded text-slate-400 text-sm hover:text-slate-200 transition-colors disabled:opacity-50"
              >
                Back
              </button>
            </div>
          )}

          {joining && (
            <p className="text-slate-500 text-xs text-center">
              This may take a moment if the server is waking up...
            </p>
          )}
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
