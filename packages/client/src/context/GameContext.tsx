import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as Colyseus from "colyseus.js";
import type { GameState } from "@durak/schema";

const WS_URL = "ws://localhost:2567";

type Room = Colyseus.Room<GameState>;

interface GameContextValue {
  client: Colyseus.Client | null;
  room: Room | null;
  isConnected: boolean;
  /** Increments when room state syncs from server; use as dependency to re-render on state changes. */
  stateVersion: number;
  connect: () => Promise<void>;
  joinOrCreate: (playerName?: string) => Promise<void>;
  leave: () => Promise<void>;
  error: string | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<Colyseus.Client | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stateVersion, setStateVersion] = useState(0);

  // Re-render consumers when room state syncs from server (e.g. player added in onJoin).
  useEffect(() => {
    if (!room) return;
    const handler = () => setStateVersion((v) => v + 1);
    room.onStateChange(handler);
    return () => room.onStateChange.remove(handler);
  }, [room]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      const c = new Colyseus.Client(WS_URL);
      setClient(c);
      setIsConnected(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to connect";
      setError(message);
      setIsConnected(false);
    }
  }, []);

  const joinOrCreate = useCallback(
    async (playerName?: string) => {
      if (!client) {
        setError("Connect first");
        return;
      }
      setError(null);
      try {
        const r = await client.joinOrCreate<GameState>("durak", { name: playerName ?? "Player" });
        setRoom(r);
        r.onLeave(() => {
          setRoom(null);
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to join room";
        setError(message);
      }
    },
    [client]
  );

  const leave = useCallback(async () => {
    if (room) {
      await room.leave();
      setRoom(null);
    }
  }, [room]);

  const value: GameContextValue = {
    client,
    room,
    isConnected,
    stateVersion,
    connect,
    joinOrCreate,
    leave,
    error,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
