import { Schema, ArraySchema, type } from "@colyseus/schema";
import { Player } from "./Player.js";
import { CardPair } from "./CardPair.js";

export class AttackStatus extends Schema {
  @type(Player) attacker: Player = new Player();
  @type(Player) defender: Player = new Player();
  @type([CardPair]) pairs = new ArraySchema<CardPair>();
}