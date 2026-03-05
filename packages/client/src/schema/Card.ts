import { Schema, type } from "@colyseus/schema";

export class Card extends Schema {
  @type("string") suit: string = "";
  @type("number") rank: number = 0;
}
