import { useCallback } from "react";
import { useGame } from "../context/GameContext";

export function Lobby() {
  const { room, leave } = useGame();
  const state = room?.state;

  if (!room || !state) return null;

  const playerCount = state.players?.size ?? 0;
  const isHost = room.sessionId === state.hostSessionId;
  const canStart = isHost && playerCount >= 2;

  const handleStart = useCallback(() => {
    room.send("startGame");
  }, [room]);

  return (
    <section className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-200">Lobby</h2>
        <button
          type="button"
          onClick={leave}
          className="px-4 py-2 rounded bg-slate-600 text-slate-200 font-medium hover:bg-slate-500"
        >
          Leave
        </button>
      </div>

      <p className="text-slate-400 text-sm">
        {isHost
          ? playerCount < 2
            ? "Waiting for at least one more player to join..."
            : "Ready! Press Start Game when everyone is in."
          : "Waiting for the host to start the game..."}
      </p>

      <div className="p-4 rounded-lg bg-slate-800/80 text-sm">
        <span className="text-slate-400">Players</span>
        <p className="text-xl font-semibold text-amber-400">{playerCount}</p>
      </div>

      <div>
        <h3 className="text-slate-400 text-sm font-medium mb-2">Players in room</h3>
        <ul className="p-4 rounded-lg bg-slate-800/80 space-y-2">
          {Array.from(state.players.entries()).map(([sessionId, player]) => (
            <li
              key={sessionId}
              className={`flex items-center gap-2 ${sessionId === room.sessionId ? "text-amber-400 font-medium" : "text-slate-200"}`}
            >
              <span>{player.name ?? "Anonymous"}</span>
              {sessionId === state.hostSessionId && (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">host</span>
              )}
              {sessionId === room.sessionId && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">you</span>
              )}
            </li>
          ))}
          {playerCount === 0 && (
            <li className="text-slate-500">No players in room</li>
          )}
        </ul>
      </div>

      {isHost && (
        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart}
          className={`w-full px-6 py-3 rounded-lg text-white font-semibold text-lg transition-colors ${
            canStart
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          {canStart ? "Start Game" : "Need at least 2 players"}
        </button>
      )}
    </section>
  );
}
