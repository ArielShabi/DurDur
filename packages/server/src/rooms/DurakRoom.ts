import { Room, Client, type Delayed } from "@colyseus/core";
import { GameState, Player, Card, CardPair } from "@durak/schema";
import { defenceMessages, failedDefenceMessages } from "../MessageConsts.js";
import { AttackErrorReason } from "../consts.js";

const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
// const RANKS = [9, 10, 11, 12, 13, 14] as const;
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;
const MIN_PLAYERS_TO_START = 2;
const DISCONNECT_TURN_TIMEOUT_MS = 30_000;
const AUTO_PASS_TIMEOUT_MS = 6_000;

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export class DurakRoom extends Room<GameState> {
  maxClients = 6;
  private disconnectTimers = new Map<string, Delayed>();
  private autoPassTimers = new Map<string, Delayed>();

  private log(msg: string, ...args: unknown[]): void {
    console.log(`[Room ${this.state?.roomCode ?? "?"}] ${msg}`, ...args);
  }

  onCreate(_options: Record<string, unknown>) {
    this.setState(new GameState());

    const roomCode = generateRoomCode();
    this.state.roomCode = roomCode;
    this.setMetadata({ roomCode });

    this.onMessage("attack", (client, message: { suit: string; rank: number }) => {
      try {
        if (this.state.currentPhase !== "attacking") return;
        if (client.sessionId !== this.state.attackStatus.attacker.sessionId) return;

        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        const card = this.removeCardFromHand(player, message.suit, message.rank);
        if (!card) return;

        this.log("attack: %s plays %s-%d", player.name, card.suit, card.rank);
        this.pushAttackCard(card, client.sessionId);
        this.state.currentPhase = "defending";
        this.scheduleAutoPassTimers();
      } catch (err) {
        this.log("ERROR in attack handler:", err);
      }
    });

    this.onMessage("addAttack", (client, message: { suit: string; rank: number }) => {
      try {
        const phase = this.state.currentPhase;
        if (phase !== "defending" && phase !== "throwing-in") return;
        if (client.sessionId === this.state.attackStatus.defender.sessionId) return;

        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        if (phase === "throwing-in") {
          if (!this.canAddThrowIn(message.rank)) return;
        } else {
          const { canAdd, reason } = this.canAddAttack(message.rank);
          if (!canAdd) {
            if (
              client.sessionId === this.state.attackStatus.attacker.sessionId
              && (
                reason === AttackErrorReason.PAIRS_FULL
                || reason === AttackErrorReason.DEFENDER_HAND_FULL
              )
            ) {
              this.trySwapAttack(player, message.suit, message.rank);
            }
            return;
          }
        }

        const card = this.removeCardFromHand(player, message.suit, message.rank);
        if (!card) return;

        this.log("addAttack (%s): %s plays %s-%d", phase, player.name, card.suit, card.rank);
        this.pushAttackCard(card, client.sessionId);
        this.state.passedPlayers.clear();
        this.scheduleAutoPassTimers();
      } catch (err) {
        this.log("ERROR in addAttack handler:", err);
      }
    });

    this.onMessage("defend", (client, message: { suit: string; rank: number; pairIndex: number }) => {
      try {
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

        this.log("defend: %s plays %s-%d on pair %d", player.name, card.suit, card.rank, message.pairIndex);
        pair.defendingCard.suit = card.suit;
        pair.defendingCard.rank = card.rank;
        player.hand.splice(cardIndex, 1);

        this.state.passedPlayers.clear();
        this.scheduleAutoPassTimers();
        this.checkDefenseSuccess();
      } catch (err) {
        this.log("ERROR in defend handler:", err);
      }
    });

    this.onMessage("pass", (client) => {
      try {
        const phase = this.state.currentPhase;
        if (phase !== "defending" && phase !== "throwing-in") return;
        if (client.sessionId === this.state.attackStatus.defender.sessionId) return;

        const player = this.state.players.get(client.sessionId);
        const idx = this.state.passedPlayers.indexOf(client.sessionId);
        if (idx === -1) {
          this.log("pass (%s): %s passed", phase, player?.name ?? client.sessionId);
          this.state.passedPlayers.push(client.sessionId);
          const timer = this.autoPassTimers.get(client.sessionId);
          if (timer) {
            timer.clear();
            this.autoPassTimers.delete(client.sessionId);
          }
        } else {
          this.log("pass (%s): %s un-passed", phase, player?.name ?? client.sessionId);
          this.state.passedPlayers.splice(idx, 1);
          this.scheduleAutoPassTimers();
        }

        if (phase === "throwing-in") {
          this.checkThrowInComplete();
        } else {
          this.checkDefenseSuccess();
        }
      } catch (err) {
        this.log("ERROR in pass handler:", err);
      }
    });

    this.onMessage("deflect", (client, message: { suit: string; rank: number }) => {
      try {
        if (this.state.currentPhase !== "defending") return;
        const { attackStatus } = this.state;
        if (client.sessionId !== attackStatus.defender.sessionId) return;

        if (!this.canDeflect(message.rank)) return;

        const player = this.state.players.get(client.sessionId);
        if (!player) return;

        this.log("deflect: %s deflects rank %d", player.name, message.rank);

        if ((message.suit === this.state.trumpCard.suit) && (!player.specialDeflectHistory.includes(message.rank))) {
          player.specialDeflectHistory.push(message.rank);
        }
        else {
          const card = this.removeCardFromHand(player, message.suit, message.rank);
          if (!card) return;

          this.pushAttackCard(card, client.sessionId);
        }

        const newDefender = this.getNextPlayerInTurnOrder(attackStatus.defender.sessionId);
        if (!newDefender) return;

        this.announce(`${player.name} העביר ל ${newDefender.name}`);

        attackStatus.attacker.assign({
          sessionId: player.sessionId,
          name: player.name,
        });
        attackStatus.defender.assign({
          sessionId: newDefender.sessionId,
          name: newDefender.name,
        });
        this.state.passedPlayers.clear();
        this.scheduleAutoPassTimers();
      } catch (err) {
        this.log("ERROR in deflect handler:", err);
      }
    });

    this.onMessage("takeCards", (client) => {
      try {
        if (this.state.currentPhase !== "defending") return;
        const { attackStatus } = this.state;
        if (client.sessionId !== attackStatus.defender.sessionId) return;

        const defender = this.state.players.get(client.sessionId);
        if (!defender) return;

        this.log("takeCards: %s gives up, entering throwing-in", defender.name);
        this.announce(`${defender.name} ${failedDefenceMessages[Math.floor(Math.random() * failedDefenceMessages.length)]}`);

        this.state.currentPhase = "throwing-in";
        this.state.passedPlayers.clear();
        this.scheduleAutoPassTimers();
      } catch (err) {
        this.log("ERROR in takeCards handler:", err);
      }
    });

    this.onMessage("startGame", (client) => {
      try {
        if (this.state.currentPhase !== "waiting") return;
        if (client.sessionId !== this.state.hostSessionId) return;
        if (this.state.players.size < MIN_PLAYERS_TO_START) return;

        this.log("startGame: host %s starting game with %d players", client.sessionId, this.state.players.size);
        this.lock();
        this.startGame();
      } catch (err) {
        this.log("ERROR in startGame handler:", err);
      }
    });

    this.onMessage("playAgain", (client) => {
      try {
        if (this.state.currentPhase !== "finished") return;
        if (client.sessionId !== this.state.hostSessionId) return;
        if (this.state.players.size < MIN_PLAYERS_TO_START) return;

        this.log("playAgain: host %s restarting game", client.sessionId);
        this.resetForNewGame();
        this.startGame();
      } catch (err) {
        this.log("ERROR in playAgain handler:", err);
      }
    });
  }

  isLegalDefense(defense: Card, attack: Card): boolean {
    const trumpSuit = this.state.trumpCard.suit;
    if (defense.suit === attack.suit) return defense.rank > attack.rank;
    if (defense.suit === trumpSuit && attack.suit !== trumpSuit) return true;
    return false;
  }

  removeCardFromHand(player: Player, suit: string, rank: number): Card | null {
    const idx = player.hand.findIndex((c) => c.suit === suit && c.rank === rank);
    if (idx === -1) return null;
    const card = player.hand.at(idx);
    if (!card) return null;
    player.hand.splice(idx, 1);
    return card;
  }

  pushAttackCard(card: Card, playedBy: string): void {
    const pair = new CardPair();
    pair.attackingCard.suit = card.suit;
    pair.attackingCard.rank = card.rank;
    pair.playedBy = playedBy;
    this.state.attackStatus.pairs.push(pair);
  }

  trySwapAttack(mainAttacker: Player, suit: string, rank: number): void {
    const { pairs } = this.state.attackStatus;

    for (let i = pairs.length - 1; i >= 0; i--) {
      const pair = pairs.at(i);
      if (!pair) continue;
      if (pair.playedBy === mainAttacker.sessionId) continue;
      if (pair.defendingCard.suit !== "" || pair.defendingCard.rank !== 0) return;

      const card = this.removeCardFromHand(mainAttacker, suit, rank);
      if (!card) return;

      const originalPlayer = this.state.players.get(pair.playedBy);
      if (originalPlayer) {
        const returnCard = new Card();
        returnCard.suit = pair.attackingCard.suit;
        returnCard.rank = pair.attackingCard.rank;
        originalPlayer.hand.push(returnCard);
      }

      pair.attackingCard.suit = suit;
      pair.attackingCard.rank = rank;
      pair.playedBy = mainAttacker.sessionId;

      this.state.passedPlayers.clear();
      this.scheduleAutoPassTimers();
      this.announce(`${mainAttacker.name} החליף קלף בהתקפה`);
      return;
    }
  }

  checkDefenseSuccess(): void {
    if (this.state.currentPhase !== "defending") return;
    if (this.undefendedCount() > 0) return;

    const defenderSessionId = this.state.attackStatus.defender.sessionId;
    const nonDefenders = Array.from(this.state.turnOrder).filter(
      (id): id is string => id !== undefined && id !== defenderSessionId,
    );
    const allPassed = nonDefenders.every(
      (id) => this.state.passedPlayers.indexOf(id) !== -1,
    );
    if (!allPassed) return;

    this.log("checkDefenseSuccess: defense succeeded, all passed");
    const defenderPlayer = this.state.players.get(defenderSessionId);
    if (defenderPlayer) {
      this.announce(`${defenderPlayer.name} ${defenceMessages[Math.floor(Math.random() * defenceMessages.length)]}`);
    }

    this.refillHands();
    this.removeFinishedPlayers();

    this.state.attackStatus.pairs.clear();
    this.state.passedPlayers.clear();

    if (this.state.turnOrder.length <= 1) {
      this.finishGame();
      return;
    }

    const defender = this.state.players.get(defenderSessionId);
    if (defender && defender.isPlaying) {
      this.playTurn(defender);
      return;
    }

    const attackerId = this.state.attackStatus.attacker.sessionId;
    const attacker = this.state.players.get(attackerId);
    if (attacker && attacker.isPlaying) {
      const next = this.getNextPlayerInTurnOrder(attackerId);
      if (next) this.playTurn(next);
      return;
    }

    const firstId = this.state.turnOrder.at(0);
    if (firstId) {
      const first = this.state.players.get(firstId);
      if (first) this.playTurn(first);
    }
  }

  resolveThrowIn(): void {
    const { attackStatus } = this.state;
    const defender = this.state.players.get(attackStatus.defender.sessionId);
    if (!defender) return;

    this.log("resolveThrowIn: %s takes %d pairs", defender.name, attackStatus.pairs.length);
    for (const pair of attackStatus.pairs) {
      const atk = new Card();
      atk.suit = pair.attackingCard.suit;
      atk.rank = pair.attackingCard.rank;
      defender.hand.push(atk);

      if (pair.defendingCard.suit !== "" || pair.defendingCard.rank !== 0) {
        const def = new Card();
        def.suit = pair.defendingCard.suit;
        def.rank = pair.defendingCard.rank;
        defender.hand.push(def);
      }
    }

    this.refillHands();
    this.removeFinishedPlayers();

    if (this.state.turnOrder.length <= 1) {
      this.finishGame();
      return;
    }

    const nextAttacker = this.getNextPlayerInTurnOrder(attackStatus.defender.sessionId);
    if (!nextAttacker) return;
    this.playTurn(nextAttacker);
  }

  canAddThrowIn(rank: number): boolean {
    const { attackStatus } = this.state;
    if (!this.getTableRanks().has(rank)) return false;
    if (attackStatus.pairs.length >= 6) return false;
    return true;
  }

  checkThrowInComplete(): void {
    if (this.state.currentPhase !== "throwing-in") return;

    const defenderSessionId = this.state.attackStatus.defender.sessionId;
    const nonDefenders = Array.from(this.state.turnOrder).filter(
      (id): id is string => id !== undefined && id !== defenderSessionId,
    );
    const allPassed = nonDefenders.every(
      (id) => this.state.passedPlayers.indexOf(id) !== -1,
    );
    if (!allPassed) return;

    this.log("checkThrowInComplete: all passed, resolving throw-in");
    this.resolveThrowIn();
  }

  refillHands(): void {
    if (this.state.deck.length === 0) return;

    const attackerIdx = this.state.turnOrder.indexOf(
      this.state.attackStatus.attacker.sessionId,
    );
    if (attackerIdx === -1) return;

    const len = this.state.turnOrder.length;
    for (let i = 0; i < len; i++) {
      const id = this.state.turnOrder.at((attackerIdx - i + len) % len);
      if (!id) continue;
      const player = this.state.players.get(id);
      if (!player) continue;

      const need = 6 - player.hand.length;
      if (need > 0) {
        player.hand.push(...this.drawCards(need));
      }
      if (this.state.deck.length === 0) break;
    }
  }

  removeFinishedPlayers(): void {
    if (this.state.deck.length > 0) return;

    const toRemove: string[] = [];
    for (const id of this.state.turnOrder) {
      if (!id) continue;
      const player = this.state.players.get(id);
      if (!player) continue;
      if (player.hand.length === 0) {
        player.isPlaying = false;
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      const idx = this.state.turnOrder.indexOf(id);
      if (idx !== -1) this.state.turnOrder.splice(idx, 1);
    }
  }

  /** Ranks of all cards currently visible on the table (both attacking and defending). */
  getTableRanks(): Set<number> {
    const ranks = new Set<number>();
    for (const pair of this.state.attackStatus.pairs) {
      ranks.add(pair.attackingCard.rank);
      if (pair.defendingCard.suit !== "" || pair.defendingCard.rank !== 0) {
        ranks.add(pair.defendingCard.rank);
      }
    }
    return ranks;
  }

  /** Number of attacks that the defender still needs to beat. */
  undefendedCount(): number {
    let count = 0;
    for (const pair of this.state.attackStatus.pairs) {
      if (pair.defendingCard.suit === "" && pair.defendingCard.rank === 0) count++;
    }
    return count;
  }

  canDeflect(rank: number): boolean {
    const { attackStatus } = this.state;
    if (attackStatus.pairs.length === 0) return false;
    if (attackStatus.pairs.length >= 6) return false;

    const allSameRank = attackStatus.pairs.every(
      (p) => p.attackingCard.rank === rank,
    );
    if (!allSameRank) return false;

    const anyDefended = attackStatus.pairs.some(
      (p) => p.defendingCard.suit !== "" || p.defendingCard.rank !== 0,
    );
    if (anyDefended) return false;

    const nextDefender = this.getNextPlayerInTurnOrder(attackStatus.defender.sessionId);
    if (!nextDefender) return false;    
    if (this.state.turnOrder.length <= 2) return false;
    if (attackStatus.pairs.length + 1 > nextDefender.hand.length) return false;

    return true;
  }

  canAddAttack(rank: number): {canAdd: boolean, reason?: string} {
    const { attackStatus } = this.state;
    if (!this.getTableRanks().has(rank)) return {canAdd: false, reason: AttackErrorReason.RANK_NOT_ALLOWED};
    if (attackStatus.pairs.length >= 6) return {canAdd: false, reason: AttackErrorReason.PAIRS_FULL};

    const defender = this.state.players.get(attackStatus.defender.sessionId);
    if (!defender) return {canAdd: false, reason: AttackErrorReason.DEFENDER_NOT_FOUND};
    if (this.undefendedCount() + 1 > defender.hand.length) return {canAdd: false, reason: AttackErrorReason.DEFENDER_HAND_FULL};


    return {canAdd: true, reason: undefined};
  }

  onJoin(client: Client, options: { name?: string } = {}) {
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options.name ?? `Player_${client.sessionId.slice(0, 6)}`;
    player.isConnected = true;
    this.state.players.set(client.sessionId, player);

    this.log("onJoin: %s (%s) joined, %d players total", player.name, client.sessionId, this.state.players.size);

    if (this.state.hostSessionId === "") {
      this.state.hostSessionId = client.sessionId;
    }
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) player.isConnected = false;

    this.log("onLeave: %s (%s) left (consented=%s)", player?.name ?? "?", client.sessionId, consented);
    this.scheduleDisconnectTimeout(client.sessionId);

    try {
      if (consented) throw new Error("consented leave");
      await this.allowReconnection(client, 120);
      this.log("onLeave: %s reconnected", player?.name ?? client.sessionId);
      if (player) player.isConnected = true;
      this.clearDisconnectTimeout(client.sessionId);
    } catch {
      this.log("onLeave: %s removed (reconnection failed/consented)", player?.name ?? client.sessionId);
      this.clearDisconnectTimeout(client.sessionId);
      this.removePlayer(client.sessionId);
    }
  }

  private scheduleDisconnectTimeout(sessionId: string): void {
    this.clearDisconnectTimeout(sessionId);

    const phase = this.state.currentPhase;
    if (phase !== "attacking" && phase !== "defending" && phase !== "throwing-in") return;

    const { attackStatus } = this.state;
    const isAttacker = sessionId === attackStatus.attacker.sessionId;
    const isDefender = sessionId === attackStatus.defender.sessionId;

    if ((phase === "defending" || phase === "throwing-in") && !isAttacker && !isDefender) {
      if (this.state.passedPlayers.indexOf(sessionId) === -1) {
        this.state.passedPlayers.push(sessionId);
        if (phase === "throwing-in") {
          this.checkThrowInComplete();
        } else {
          this.checkDefenseSuccess();
        }
      }
      return;
    }

    if (phase === "throwing-in" && isDefender) return;

    if (!isAttacker && !isDefender) return;

    const timer = this.clock.setTimeout(() => {
      this.disconnectTimers.delete(sessionId);
      this.autoResolveTurn(sessionId);
    }, DISCONNECT_TURN_TIMEOUT_MS);

    this.disconnectTimers.set(sessionId, timer);
  }

  private scheduleAutoPassTimers(): void {
    this.clearAutoPassTimers();
    const phase = this.state.currentPhase;
    if (phase !== "defending" && phase !== "throwing-in") return;

    const defenderSessionId = this.state.attackStatus.defender.sessionId;
    for (const id of this.state.turnOrder) {
      if (!id) continue;
      if (id === defenderSessionId) continue;
      if (this.state.passedPlayers.indexOf(id) !== -1) continue;

      const timer = this.clock.setTimeout(() => {
        this.autoPassTimers.delete(id);
        const curPhase = this.state.currentPhase;
        if (curPhase !== "defending" && curPhase !== "throwing-in") return;
        if (this.state.passedPlayers.indexOf(id) !== -1) return;

        this.state.passedPlayers.push(id);
        if (curPhase === "throwing-in") {
          this.checkThrowInComplete();
        } else {
          this.checkDefenseSuccess();
        }
      }, AUTO_PASS_TIMEOUT_MS);

      this.autoPassTimers.set(id, timer);
    }
  }

  private clearAutoPassTimers(): void {
    for (const timer of this.autoPassTimers.values()) {
      timer.clear();
    }
    this.autoPassTimers.clear();
  }

  private clearDisconnectTimeout(sessionId: string): void {
    const timer = this.disconnectTimers.get(sessionId);
    if (timer) {
      timer.clear();
      this.disconnectTimers.delete(sessionId);
    }
  }

  private autoResolveTurn(sessionId: string): void {
    const { attackStatus } = this.state;

    if (this.state.currentPhase === "attacking" && sessionId === attackStatus.attacker.sessionId) {
      const nextAttacker = this.getNextPlayerInTurnOrder(attackStatus.defender.sessionId);
      if (nextAttacker) this.playTurn(nextAttacker);
      return;
    }

    if (this.state.currentPhase === "defending" && sessionId === attackStatus.defender.sessionId) {
      this.resolveThrowIn();
      return;
    }

    if (this.state.currentPhase === "throwing-in" && sessionId === attackStatus.defender.sessionId) {
      this.resolveThrowIn();
    }
  }

  private removePlayer(sessionId: string): void {
    this.state.players.delete(sessionId);
    const idx = this.state.turnOrder.indexOf(sessionId);
    if (idx !== -1) this.state.turnOrder.splice(idx, 1);

    if (sessionId === this.state.hostSessionId) {
      const nextHost = this.state.players.keys().next().value as string | undefined;
      this.state.hostSessionId = nextHost ?? "";
    }

    const phase = this.state.currentPhase;
    if (phase !== "attacking" && phase !== "defending" && phase !== "throwing-in") return;
    if (this.state.turnOrder.length <= 1) {
      this.finishGame();
      return;
    }

    const { attackStatus } = this.state;
    const wasAttacker = sessionId === attackStatus.attacker.sessionId;
    const wasDefender = sessionId === attackStatus.defender.sessionId;

    if (wasAttacker && phase === "attacking") {
      const nextId = this.state.turnOrder.at(0);
      if (nextId) {
        const next = this.state.players.get(nextId);
        if (next) this.playTurn(next);
      }
      return;
    }

    if (wasDefender) {
      if (phase === "throwing-in") {
        this.resolveThrowIn();
      } else {
        this.refillHands();
        this.removeFinishedPlayers();
        if (this.state.turnOrder.length <= 1) {
          this.finishGame();
          return;
        }
        const attacker = this.state.players.get(attackStatus.attacker.sessionId);
        if (attacker) {
          const next = this.getNextPlayerInTurnOrder(attacker.sessionId);
          if (next) this.playTurn(next);
        }
      }
      return;
    }

    const passIdx = this.state.passedPlayers.indexOf(sessionId);
    if (passIdx !== -1) this.state.passedPlayers.splice(passIdx, 1);
    if (phase === "throwing-in") {
      this.checkThrowInComplete();
    } else {
      this.checkDefenseSuccess();
    }
  }

  finishGame(): void {
    this.clearAutoPassTimers();
    const durakId = this.state.turnOrder.at(0);
    this.state.durakSessionId = durakId ?? "";
    this.state.currentPhase = "finished";

    this.log("finishGame: game over, durak=%s", durakId ?? "none");
    if (durakId) {
      const durak = this.state.players.get(durakId);
      if (durak) {
        this.announce(`${durak.name} הוא הדור על דף ווב`);
      }
    }
  }

  resetForNewGame(): void {
    this.state.deck.clear();
    this.state.table.clear();
    this.state.turnOrder.clear();
    this.state.passedPlayers.clear();
    this.state.attackStatus.pairs.clear();
    this.state.attackStatus.attacker.assign({ sessionId: "", name: "" });
    this.state.attackStatus.defender.assign({ sessionId: "", name: "" });
    this.state.trumpCard.suit = "";
    this.state.trumpCard.rank = 0;

    this.state.players.forEach((player) => {
      player.hand.clear();
      player.isPlaying = false;
    });
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

    const lastIndex = this.state.deck.length - 1;
    if (lastIndex >= 0) {
      const trump = this.state.deck.at(lastIndex);
      if (trump) {
        this.state.trumpCard.suit = trump.suit;
        this.state.trumpCard.rank = trump.rank;
      }
    }

    this.state.currentPhase = "playing";

    this.state.players.forEach((player) => {
      player.isPlaying = true;
      player.hand.push(...this.drawCards(6));
    });

    // Check for special swap
    this.checkSpecialSwap();

    this.state.turnOrder.clear();
    for (const id of this.state.players.keys()) {
      this.state.turnOrder.push(id);
    }

    const durak = this.state.durakSessionId
      ? this.state.players.get(this.state.durakSessionId)
      : null;

    if (durak) {
      const attacker = this.getPreviousPlayerInTurnOrder(durak.sessionId);
      if (attacker) {
        this.playTurn(attacker);
      } else {
        this.playTurn(this.getFirstPlayer());
      }
    } else {
      this.playTurn(this.getFirstPlayer());
    }
  }

  checkSpecialSwap(): void {
    const trumpSuit = this.state.trumpCard.suit;
    const trumpRank = this.state.trumpCard.rank;
    if (!trumpSuit) return;

    const SWAP_ACE = 14;
    const SWAP_TWO = 2;

    let targetRank: number;
    if (trumpRank === SWAP_TWO) {
      targetRank = SWAP_ACE;
    } else if (trumpRank === SWAP_ACE) {
      targetRank = SWAP_TWO;
    } else {
      return;
    }

    for (const player of this.state.players.values()) {
      const idx = player.hand.findIndex(
        (c) => c.suit === trumpSuit && c.rank === targetRank,
      );
      if (idx === -1) continue;

      const deckLastIdx = this.state.deck.length - 1;
      const deckTrump = this.state.deck.at(deckLastIdx);
      if (!deckTrump) break;

      const playerCard = player.hand.at(idx)!;
      const oldRank = playerCard.rank;

      playerCard.suit = deckTrump.suit;
      playerCard.rank = deckTrump.rank;

      deckTrump.suit = trumpSuit;
      deckTrump.rank = oldRank;

      this.state.trumpCard.rank = oldRank;

      const rankLabel = oldRank === SWAP_ACE ? "A" : "2";
      
      this.announce(
        `החלפה! ${player.name} החלף את ה${rankLabel}`
      );
      break;
    }
  }

  playTurn(attacker: Player): void {
    this.clearAutoPassTimers();
    const defender = this.getNextPlayerInTurnOrder(attacker.sessionId);
    if (!defender) return;

    this.log("playTurn: %s attacks, %s defends", attacker.name, defender.name);
    this.state.attackStatus.attacker.assign({
      sessionId: attacker.sessionId,
      name: attacker.name,
    });
    this.state.attackStatus.defender.assign({
      sessionId: defender.sessionId,
      name: defender.name,
    });
    this.state.attackStatus.pairs.clear();
    this.state.passedPlayers.clear();
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

  getPreviousPlayerInTurnOrder(sessionId: string): Player | null {
    const len = this.state.turnOrder.length;
    const index = this.state.turnOrder.indexOf(sessionId);
    if (index === -1) return null;
    const prevIndex = (index - 1 + len) % len;
    const prevId = this.state.turnOrder.at(prevIndex);
    if (!prevId) return null;
    return this.state.players.get(prevId) ?? null;
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
    return this.state.deck.shift() ?? null;
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

  announce(message: string): void {
    this.broadcast("announcement", { message });
  }

  onDispose() {
    // optional cleanup
  }
}
