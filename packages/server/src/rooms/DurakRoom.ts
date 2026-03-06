import { Room, Client } from "@colyseus/core";
import { GameState, Player, Card, CardPair } from "@durak/schema";

const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
const PLAYERS_TO_START = 4;

export class DurakRoom extends Room<GameState> {
  maxClients = 6;

  onCreate(_options: Record<string, unknown>) {
    this.setState(new GameState());

    this.onMessage("attack", (client, message: { suit: string; rank: number }) => {
      const { attackStatus } = this.state;
      if (client.sessionId !== attackStatus.attacker.sessionId) return;

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const cardIndex = player.hand.findIndex(
        (c) => c.suit === message.suit && c.rank === message.rank,
      );
      if (cardIndex === -1) return;

      const card = player.hand.at(cardIndex);
      if (!card) return;
      const pair = new CardPair();
      pair.attackingCard.suit = card.suit;
      pair.attackingCard.rank = card.rank;
      attackStatus.pairs.push(pair);

      player.hand.splice(cardIndex, 1);
      this.state.currentPhase = "defending";
    });

    this.onMessage("defend", (client, message: { suit: string; rank: number; pairIndex: number }) => {
      const { attackStatus } = this.state;
      if (this.state.currentPhase !== "defending") return;
      if (client.sessionId !== attackStatus.defender.sessionId) return;

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const pair = attackStatus.pairs.at(message.pairIndex);
      if (!pair) return;
      if (pair.defendingCard.suit !== "" || pair.defendingCard.rank !== 0) return;

      const cardIndex = player.hand.findIndex(
        (c) => c.suit === message.suit && c.rank === message.rank,
      );
      if (cardIndex === -1) return;

      const card = player.hand.at(cardIndex);
      if (!card) return;

      if (!this.isLegalDefense(card, pair.attackingCard)) return;

      pair.defendingCard.suit = card.suit;
      pair.defendingCard.rank = card.rank;
      player.hand.splice(cardIndex, 1);
    });
  }

  isLegalDefense(defense: Card, attack: Card): boolean {
    const trumpSuit = this.state.trumpCard.suit;
    if (defense.suit === attack.suit) return defense.rank > attack.rank;
    if (defense.suit === trumpSuit && attack.suit !== trumpSuit) return true;
    return false;
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

    this.state.turnOrder.clear();
    for (const id of this.state.players.keys()) {
      this.state.turnOrder.push(id);
    }

    const firstPlayer = this.getFirstPlayer();
    this.playTurn(firstPlayer);
  }

  playTurn(attacker: Player): void {
    const defender = this.getNextPlayerInTurnOrder(attacker.sessionId);
    if (!defender) return;

    this.state.attackStatus.attacker.assign({
      sessionId: attacker.sessionId,
      name: attacker.name,
    });
    this.state.attackStatus.defender.assign({
      sessionId: defender.sessionId,
      name: defender.name,
    });
    this.state.attackStatus.pairs.clear();
    this.state.currentPhase = "attacking";
  }

  getNextPlayerInTurnOrder(sessionId: string): Player | null {
    const index = this.state.turnOrder.indexOf(sessionId);
    if (index === -1) return null;
    const nextIndex = (index + 1) % this.state.turnOrder.length;
    const nextId = this.state.turnOrder.at(nextIndex);
    if (!nextId) return null;
    return this.state.players.get(nextId) ?? null;
  }

  
  getFirstPlayer(): Player {
    const lowestTrumpCardOfEachPlayer = Array.from(this.state.players.values()).map((player) => {
      return player.hand.reduce((min: number, card: Card) => {
        if (card.suit === this.state.trumpCard.suit)
          return Math.min(min, card.rank);
        return min;
      }, Infinity);
    });

    const lowestTrumpCardOfEachPlayerIndex = lowestTrumpCardOfEachPlayer.indexOf(Math.min(...lowestTrumpCardOfEachPlayer));
    return Array.from(this.state.players.values())[lowestTrumpCardOfEachPlayerIndex];
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
