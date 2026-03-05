import { useGame } from "../context/GameContext";

export function Lobby() {
  const { room, leave } = useGame();
  const state = room?.state;

  if (!room || !state) return null;

  const playerCount = state.players?.size ?? 0;
  const phase = state.currentPhase ?? "—";

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
        Waiting for 4 players to start… ({playerCount}/4)
      </p>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-4 rounded-lg bg-slate-800/80">
          <span className="text-slate-400">Players</span>
          <p className="text-xl font-semibold text-amber-400">{playerCount}</p>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/80">
          <span className="text-slate-400">Phase</span>
          <p className="text-xl font-semibold capitalize">{phase}</p>
        </div>
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
    </section>
  );
}
