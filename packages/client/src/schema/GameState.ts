import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { Player } from "./Player";
import { Card } from "./Card";

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Card]) deck = new ArraySchema<Card>();
  @type(Card) trumpCard = new Card();
  @type([Card]) table = new ArraySchema<Card>();
  @type("string") currentPhase: string = "waiting";
}
