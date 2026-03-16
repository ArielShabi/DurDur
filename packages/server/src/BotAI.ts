import type { GameState, Player, Card } from "@durak/schema";

interface CardChoice {
  suit: string;
  rank: number;
}

interface DefendAction {
  type: "defend";
  suit: string;
  rank: number;
  pairIndex: number;
}

interface DeflectAction {
  type: "deflect";
  suit: string;
  rank: number;
}

interface TakeAction {
  type: "take";
}

type DefenseAction = DefendAction | DeflectAction | TakeAction;

interface RoomLike {
  isLegalDefense(defense: Card, attack: Card): boolean;
  canDeflect(rank: number): boolean;
}

function cardValue(card: CardChoice, trumpSuit: string): number {
  return card.suit === trumpSuit ? 100 + card.rank : card.rank;
}

function sortByValue(cards: CardChoice[], trumpSuit: string): CardChoice[] {
  return [...cards].sort((a, b) => cardValue(a, trumpSuit) - cardValue(b, trumpSuit));
}

export class BotAI {
  static chooseAttack(bot: Player, state: GameState): CardChoice | null {
    const trumpSuit = state.trumpCard.suit;
    const hand = handToCards(bot);
    if (hand.length === 0) return null;

    const sorted = sortByValue(hand, trumpSuit);
    return sorted[0] ?? null;
  }

  static chooseAddAttack(bot: Player, state: GameState): CardChoice | null {
    const trumpSuit = state.trumpCard.suit;
    const tableRanks = getTableRanks(state);
    const hand = handToCards(bot);

    const eligible = hand.filter((c) => tableRanks.has(c.rank));
    if (eligible.length === 0) return null;

    const sorted = sortByValue(eligible, trumpSuit);
    return sorted[0] ?? null;
  }

  static chooseThrowIn(bot: Player, state: GameState): CardChoice | null {
    const trumpSuit = state.trumpCard.suit;
    const tableRanks = getTableRanks(state);
    const hand = handToCards(bot);
    const { attackStatus } = state;

    const defender = state.players.get(attackStatus.defender.sessionId);
    if (!defender) return null;
    if (attackStatus.pairs.length >= 6) return null;
    if (attackStatus.pairs.length + 1 > defender.hand.length) return null;

    const eligible = hand.filter((c) => tableRanks.has(c.rank));
    if (eligible.length === 0) return null;

    const sorted = sortByValue(eligible, trumpSuit);
    return sorted[0] ?? null;
  }

  static chooseDefense(bot: Player, state: GameState, room: RoomLike): DefenseAction {
    const trumpSuit = state.trumpCard.suit;
    const { attackStatus } = state;

    const undefendedPairs: { pair: { attackingCard: Card }; index: number }[] = [];
    for (let i = 0; i < attackStatus.pairs.length; i++) {
      const pair = attackStatus.pairs.at(i);
      if (!pair) continue;
      if (pair.defendingCard.suit === "" && pair.defendingCard.rank === 0) {
        undefendedPairs.push({ pair, index: i });
      }
    }

    if (undefendedPairs.length === 0) return { type: "take" };

    if (undefendedPairs.length === 1 && room.canDeflect(undefendedPairs[0]!.pair.attackingCard.rank)) {
      const atkRank = undefendedPairs[0]!.pair.attackingCard.rank;
      const deflectCard = handToCards(bot).find((c) => c.rank === atkRank);
      if (deflectCard && cardValue(deflectCard, trumpSuit) < 50) {
        return { type: "deflect", suit: deflectCard.suit, rank: deflectCard.rank };
      }
    }

    const hand = handToCards(bot).map((c, i) => ({ ...c, idx: i }));

    const usedIndices = new Set<number>();
    const defenses: DefendAction[] = [];

    for (const { pair, index: pairIndex } of undefendedPairs) {
      const atk = pair.attackingCard;
      const candidates = hand
        .filter((c) => !usedIndices.has(c.idx))
        .filter((c) => {
          const asCard = { suit: c.suit, rank: c.rank } as Card;
          return room.isLegalDefense(asCard, atk);
        })
        .sort((a, b) => cardValue(a, trumpSuit) - cardValue(b, trumpSuit));

      if (candidates.length === 0) {
        return { type: "take" };
      }

      const best = candidates[0]!;
      usedIndices.add(best.idx);
      defenses.push({ type: "defend", suit: best.suit, rank: best.rank, pairIndex });
    }

    return defenses[0] ?? { type: "take" };
  }
}

function handToCards(player: Player): CardChoice[] {
  const cards: CardChoice[] = [];
  for (let i = 0; i < player.hand.length; i++) {
    const c = player.hand.at(i);
    if (c) cards.push({ suit: c.suit, rank: c.rank });
  }
  return cards;
}

function getTableRanks(state: GameState): Set<number> {
  const ranks = new Set<number>();
  for (const pair of state.attackStatus.pairs) {
    ranks.add(pair.attackingCard.rank);
    if (pair.defendingCard.suit !== "" || pair.defendingCard.rank !== 0) {
      ranks.add(pair.defendingCard.rank);
    }
  }
  return ranks;
}
