import { useCallback, useState } from "react";
import { useGame } from "../context/GameContext";

export function Lobby() {
  const { room, leave } = useGame();
  const state = room?.state;
  const [copied, setCopied] = useState(false);

  if (!room || !state) return null;

  const playerCount = state.players?.size ?? 0;
  const isHost = room.sessionId === state.hostSessionId;
  const canStart = isHost && playerCount >= 2;
  const canAddBot = isHost && playerCount < 6;
  const roomCode = state.roomCode;

  const handleStart = useCallback(() => {
    room.send("startGame");
  }, [room]);

  const handleAddBot = useCallback(() => {
    room.send("addBot");
  }, [room]);

  const handleRemoveBot = useCallback((sessionId: string) => {
    room.send("removeBot", { sessionId });
  }, [room]);

  const handleCopyCode = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}?code=${roomCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomCode]);

  return (
    <section className="space-y-6 max-w-2xl mx-auto">
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

      {roomCode && (
        <div className="p-4 rounded-lg bg-slate-800/80 text-center space-y-2">
          <span className="text-slate-400 text-sm">Room Code</span>
          <p className="text-3xl font-bold font-mono tracking-[0.3em] text-amber-400">
            {roomCode}
          </p>
          <button
            type="button"
            onClick={handleCopyCode}
            className="text-sm px-3 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
          >
            {copied ? "Link copied!" : "Copy invite link"}
          </button>
        </div>
      )}

      <p className="text-slate-400 text-sm">
        {isHost
          ? playerCount < 2
            ? "Share the room code with your friends and wait for them to join."
            : "Ready! Press Start Game when everyone is in."
          : "Waiting for the host to start the game..."}
      </p>

      <div>
        <h3 className="text-slate-400 text-sm font-medium mb-2">
          Players ({playerCount})
        </h3>
        <ul className="p-4 rounded-lg bg-slate-800/80 space-y-2">
          {Array.from(state.players.entries()).map(([sessionId, player]) => (
            <li
              key={sessionId}
              className={`flex items-center gap-2 ${sessionId === room.sessionId ? "text-amber-400 font-medium" : "text-slate-200"}`}
            >
              <span>{player.name ?? "Anonymous"}</span>
              {sessionId === state.hostSessionId && (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  host
                </span>
              )}
              {sessionId === room.sessionId && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  you
                </span>
              )}
              {player.isBot && (
                <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-400">
                  bot
                </span>
              )}
              {isHost && player.isBot && (
                <button
                  type="button"
                  onClick={() => handleRemoveBot(sessionId)}
                  className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  remove
                </button>
              )}
            </li>
          ))}
          {playerCount === 0 && (
            <li className="text-slate-500">No players in room</li>
          )}
        </ul>
      </div>

      {isHost && (
        <div className="flex flex-col gap-3">
          {canAddBot && (
            <button
              type="button"
              onClick={handleAddBot}
              className="w-full px-6 py-3 rounded-lg text-white font-semibold text-lg transition-colors bg-violet-600 hover:bg-violet-500"
            >
              Add Bot
            </button>
          )}
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
        </div>
      )}
    </section>
  );
}
