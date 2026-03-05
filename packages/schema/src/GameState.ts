import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { Player } from "./Player.js";
import { Card } from "./Card.js";
import { AttackStatus } from "./AttackStatus.js";

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Card]) deck = new ArraySchema<Card>();
  @type(Card) trumpCard = new Card();
  @type([Card]) table = new ArraySchema<Card>();
  @type("string") currentPhase: string = "waiting";
  @type(AttackStatus) attackStatus = new AttackStatus();
}
