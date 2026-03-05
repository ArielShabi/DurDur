import express from "express";
import { createServer } from "http";
import cors from "cors";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { DurakRoom } from "./rooms/DurakRoom.js";

const app = express();
const port = Number(process.env.PORT ?? 2567);

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const gameServer = new Server({
  server: httpServer,
});

gameServer.define("durak", DurakRoom);

app.use("/monitor", monitor());

httpServer.listen(port, () => {
  console.log(`Colyseus server listening on ws://localhost:${port}`);
  console.log(`Monitor at http://localhost:${port}/monitor`);
});
