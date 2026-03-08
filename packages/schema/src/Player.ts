import { Schema, ArraySchema, type } from "@colyseus/schema";
import { Card } from "./Card.js";

export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("boolean") isConnected: boolean = true;
  @type([Card]) hand = new ArraySchema<Card>();
  @type("boolean") isPlaying: boolean = false;
}
