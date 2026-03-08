import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Colyseus from "colyseus.js";
import type { GameState } from "@durak/schema";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:2567";
const TOKEN_KEY = "durak_reconnection_token";

type Room = Colyseus.Room<GameState>;

interface GameContextValue {
  client: Colyseus.Client;
  room: Room | null;
  isConnected: boolean;
  reconnecting: boolean;
  /** Increments when room state syncs from server; use as dependency to re-render on state changes. */
  stateVersion: number;
  joinOrCreate: (playerName?: string) => Promise<void>;
  leave: () => Promise<void>;
  error: string | null;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new Colyseus.Client(WS_URL));
  const [room, setRoom] = useState<Room | null>(null);
  const [reconnecting, setReconnecting] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) !== null,
  );
  const [error, setError] = useState<string | null>(null);
  const [stateVersion, setStateVersion] = useState(0);

  useEffect(() => {
    if (!room) return;
    const handler = () => setStateVersion((v) => v + 1);
    room.onStateChange(handler);
    return () => room.onStateChange.remove(handler);
  }, [room]);

  const attachRoom = useCallback((r: Room) => {
    setRoom(r);
    sessionStorage.setItem(TOKEN_KEY, r.reconnectionToken);
    r.onLeave(() => {
      setRoom(null);
    });
  }, []);

  const reconnectAttempted = useRef(false);
  useEffect(() => {
    if (reconnectAttempted.current) return;
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    reconnectAttempted.current = true;

    client
      .reconnect<GameState>(token)
      .then((r) => {
        attachRoom(r);
      })
      .catch(() => {
        sessionStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => {
        setReconnecting(false);
      });
  }, [client, attachRoom]);

  const joinOrCreate = useCallback(
    async (playerName?: string) => {
      setError(null);
      try {
        const r = await client.joinOrCreate<GameState>("durak", {
          name: playerName ?? "Player",
        });
        attachRoom(r);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to join room";
        setError(message);
      }
    },
    [client, attachRoom],
  );

  const leave = useCallback(async () => {
    sessionStorage.removeItem(TOKEN_KEY);
    if (room) {
      await room.leave();
      setRoom(null);
    }
  }, [room]);

  const value: GameContextValue = {
    client,
    room,
    isConnected: true,
    reconnecting,
    stateVersion,
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
