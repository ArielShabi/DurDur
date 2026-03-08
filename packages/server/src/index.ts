import express from "express";
import { createServer } from "http";
import cors from "cors";
import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { DurakRoom } from "./rooms/DurakRoom.js";

const app = express();
const port = Number(process.env.PORT ?? 2567);

const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));
app.use(express.json());

const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("durak", DurakRoom);

const monitorPassword = process.env.MONITOR_PASSWORD;
if (monitorPassword) {
  app.use("/monitor", (req, res, next) => {
    const pw = req.query.password ?? req.headers["x-monitor-password"];
    if (pw !== monitorPassword) return res.status(403).send("Forbidden");
    next();
  }, monitor());
}

app.get("/api/find-room", async (req, res) => {
  const code = (req.query.code as string)?.toUpperCase();
  if (!code) return res.status(400).json({ error: "Missing room code" });

  try {
    const rooms = await matchMaker.query({ name: "durak" });
    const room = rooms.find(
      (r) => (r.metadata as Record<string, unknown>)?.roomCode === code && r.clients < r.maxClients && !r.locked,
    );
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json({ roomId: room.roomId });
  } catch {
    res.status(500).json({ error: "Internal error" });
  }
});

httpServer.listen(port, () => {
  console.log(`Colyseus server listening on ws://localhost:${port}`);
});
