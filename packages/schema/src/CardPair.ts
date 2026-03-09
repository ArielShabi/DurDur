import { Schema, type } from "@colyseus/schema";
import { Card } from "./Card.js";

/** A pair of cards: the attacking card and the card used to defend against it. */
export class CardPair extends Schema {
  @type(Card) attackingCard: Card = new Card();
  @type(Card) defendingCard: Card = new Card();
  @type("string") playedBy: string = "";
}
