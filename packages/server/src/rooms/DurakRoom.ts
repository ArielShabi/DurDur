import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState.js";
import { Player } from "../schema/Player.js";
import { Card } from "../schema/Card.js";

const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
const PLAYERS_TO_START = 4;

export class DurakRoom extends Room<GameState> {
  maxClients = 6;

  onCreate(_options: Record<string, unknown>) {
    this.setState(new GameState());
  }

  onJoin(client: Client, options: { name?: string } = {}) {
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options.name ?? `Player_${client.sessionId.slice(0, 6)}`;
    player.isConnected = true;
    this.state.players.set(client.sessionId, player);

    if (this.state.players.size === PLAYERS_TO_START) {
      this.startGame();
    }
  }

  onLeave(client: Client, _consented: boolean) {
    this.state.players.delete(client.sessionId);
  }

  startGame(): void {
    this.state.deck.clear();
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        const card = new Card();
        card.suit = suit;
        card.rank = rank;
        this.state.deck.push(card);
      }
    }
    this.state.deck.sort(() => Math.random() - 0.5);

    // Set trump from the bottom card (last in deck) and remove it from the deck
    const lastIndex = this.state.deck.length - 1;
    if (lastIndex >= 0) {
      const trump = this.state.deck.at(lastIndex);
      if (trump) {
        this.state.trumpCard.suit = trump.suit;
        this.state.trumpCard.rank = trump.rank;
      }
      this.state.deck.splice(lastIndex, 1);
    }

    this.state.currentPhase = "playing";

    this.state.players.forEach((player) => {
      player.hand.push(...this.drawCards(6));
    });

  }

  /** Draw one card from the deck. Returns the card or null if deck is empty. */
  drawCard(): Card | null {
    if (this.state.deck.length === 0) return null;
    return this.state.deck.pop() ?? null;
  }

  drawCards(count: number): Card[] {
    const cards = [];
    for (let i = 0; i < count; i++) {
      const card = this.drawCard();
      if (!card) {
        break;
      }

      cards.push(card);
    }

    return cards;
  }

  onDispose() {
    // optional cleanup
  }
}
