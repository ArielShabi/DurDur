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
const HTTP_URL = WS_URL.replace(/^ws/, "http");
const TOKEN_KEY = "durak_reconnection_token";

type Room = Colyseus.Room<GameState>;

interface GameContextValue {
  client: Colyseus.Client;
  room: Room | null;
  isConnected: boolean;
  connectionLost: boolean;
  reconnecting: boolean;
  joining: boolean;
  stateVersion: number;
  createRoom: (playerName?: string) => Promise<void>;
  joinRoom: (code: string, playerName?: string) => Promise<void>;
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
  const [joining, setJoining] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
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
    setConnectionLost(false);
    sessionStorage.setItem(TOKEN_KEY, r.reconnectionToken);
    r.onLeave(async (code) => {
      if (code === 1000 || code === 4000) {
        setRoom(null);
        return;
      }
      setConnectionLost(true);
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          const newRoom = await client.reconnect<GameState>(token);
          attachRoom(newRoom);
          return;
        } catch { /* reconnect failed */ }
      }
      sessionStorage.removeItem(TOKEN_KEY);
      setRoom(null);
      setConnectionLost(false);
    });
  }, [client]);

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

  const createRoom = useCallback(
    async (playerName?: string) => {
      setError(null);
      setJoining(true);
      try {
        const r = await client.create<GameState>("durak", {
          name: playerName ?? "Player",
        });
        attachRoom(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create room");
      } finally {
        setJoining(false);
      }
    },
    [client, attachRoom],
  );

  const joinRoom = useCallback(
    async (code: string, playerName?: string) => {
      setError(null);
      setJoining(true);
      try {
        const resp = await fetch(
          `${HTTP_URL}/api/find-room?code=${encodeURIComponent(code.toUpperCase())}`,
        );
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(
            (body as { error?: string }).error ?? "Room not found",
          );
        }
        const { roomId } = (await resp.json()) as { roomId: string };
        const r = await client.joinById<GameState>(roomId, {
          name: playerName ?? "Player",
        });
        attachRoom(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to join room");
      } finally {
        setJoining(false);
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
    isConnected: room !== null,
    connectionLost,
    reconnecting,
    joining,
    stateVersion,
    createRoom,
    joinRoom,
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
