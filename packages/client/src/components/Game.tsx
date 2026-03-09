import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "../context/GameContext";
import { TrumpCard } from "./TrumpCard";
import { DeckPlaceholder } from "./DeckPlaceholder";
import { Hand } from "./Hand";
import { FaceDownHand } from "./FaceDownHand";
import { GameTable } from "./GameTable";
import { AttackStatusDisplay } from "./AttackStatusDisplay";
import { GameAnnouncement } from "./GameAnnouncement";

export function Game() {
  const { room, leave } = useGame();
  const state = room?.state;

  const [announcement, setAnnouncement] = useState<{ message: string; id: number } | null>(null);
  const announcementSeq = useRef(0);

  useEffect(() => {
    if (!room) return;
    return room.onMessage("announcement", (data: { message: string }) => {
      announcementSeq.current += 1;
      setAnnouncement({ message: data.message, id: announcementSeq.current });
    });
  }, [room]);

  if (!room || !state) return null;

  const isFinished = state.currentPhase === "finished";
  const isHost = room.sessionId === state.hostSessionId;
  const durakPlayer = state.durakSessionId
    ? state.players.get(state.durakSessionId)
    : null;

  const handlePlayAgain = useCallback(() => {
    room.send("playAgain");
  }, [room]);

  const myPlayer = state.players.get(room.sessionId);
  const serverHand = myPlayer
    ? Array.from(myPlayer.hand)
        .filter((c) => c != null)
        .map((c) => ({ suit: c.suit, rank: c.rank }))
    : [];

  const [handOrder, setHandOrder] = useState<{ suit: string; rank: number }[]>([]);

  const trumpSuit = state.trumpCard?.suit;
  const sortCards = useCallback(
    (cards: { suit: string; rank: number }[]) => {
      const nonTrumpSuits = ["hearts", "spades", "diamonds", "clubs"].filter(
        (s) => s !== trumpSuit,
      );
      const suitOrder: Record<string, number> = {};
      nonTrumpSuits.forEach((s, i) => (suitOrder[s] = i));
      if (trumpSuit) suitOrder[trumpSuit] = nonTrumpSuits.length;

      return [...cards].sort((a, b) => {
        const suitDiff = (suitOrder[a.suit] ?? 9) - (suitOrder[b.suit] ?? 9);
        if (suitDiff !== 0) return suitDiff;
        return a.rank - b.rank;
      });
    },
    [trumpSuit],
  );

  const [autoSort, setAutoSort] = useState(false);
  const autoSortRef = useRef(false);

  const dealQueueRef = useRef<{ suit: string; rank: number }[]>([]);
  const dealTimerRef = useRef<number>(0);

  const serverHandKey = serverHand.map((c) => `${c.suit}:${c.rank}`).join(",");
  useEffect(() => {
    clearInterval(dealTimerRef.current);
    dealQueueRef.current = [];

    setHandOrder((prev) => {
      const serverSet = new Set(serverHand.map((c) => `${c.suit}:${c.rank}`));
      const kept = prev.filter((c) => serverSet.has(`${c.suit}:${c.rank}`));
      const keptSet = new Set(kept.map((c) => `${c.suit}:${c.rank}`));
      const added = serverHand.filter((c) => !keptSet.has(`${c.suit}:${c.rank}`));

      if (added.length <= 1) {
        const result = [...kept, ...added];
        return autoSortRef.current ? sortCards(result) : result;
      }

      dealQueueRef.current = added.slice(1);
      const result = [...kept, added[0]!];
      return autoSortRef.current ? sortCards(result) : result;
    });

    dealTimerRef.current = window.setInterval(() => {
      const card = dealQueueRef.current.shift();
      if (!card) {
        clearInterval(dealTimerRef.current);
        return;
      }
      setHandOrder((prev) => {
        const next = [...prev, card];
        return autoSortRef.current ? sortCards(next) : next;
      });
    }, 150);

    return () => clearInterval(dealTimerRef.current);
  }, [serverHandKey, sortCards]);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setHandOrder((prev) => {
      const next = [...prev];
      const moved = next.splice(fromIndex, 1)[0];
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const handleSort = useCallback(() => {
    setAutoSort((prev) => {
      const next = !prev;
      autoSortRef.current = next;
      if (next) {
        setHandOrder((h) => sortCards(h));
      }
      return next;
    });
  }, [sortCards]);

  const trump = state.trumpCard;
  const hasTrump = trump?.suit && trump?.rank;

  const isMyAttack =
    state.currentPhase === "attacking" &&
    state.attackStatus.attacker.sessionId === room.sessionId;

  const [attackFlash, setAttackFlash] = useState(false);
  useEffect(() => {
    if (!isMyAttack) {
      setAttackFlash(false);
      return;
    }
    const timer = window.setTimeout(() => setAttackFlash(true), 8000);
    return () => window.clearTimeout(timer);
  }, [isMyAttack]);

  const isMyDefense =
    state.currentPhase === "defending" &&
    state.attackStatus.defender.sessionId === room.sessionId;

  const isThrowingIn = state.currentPhase === "throwing-in";
  const isMyThrowIn =
    isThrowingIn &&
    state.attackStatus.defender.sessionId === room.sessionId;

  const canAddAttack =
    (state.currentPhase === "defending" || isThrowingIn) &&
    !isMyDefense &&
    !isMyThrowIn;

  const handleCardClick = useCallback(
    (card: { suit: string; rank: number }) => {
      if (isMyAttack) {
        room.send("attack", { suit: card.suit, rank: card.rank });
      } else if (canAddAttack) {
        room.send("addAttack", { suit: card.suit, rank: card.rank });
      }
    },
    [room, isMyAttack, canAddAttack],
  );

  const handleDefend = useCallback(
    (card: { suit: string; rank: number }, pairIndex: number) => {
      if (!isMyDefense) return;
      room.send("defend", { suit: card.suit, rank: card.rank, pairIndex });
    },
    [room, isMyDefense],
  );

  const handleDeflect = useCallback(
    (card: { suit: string; rank: number }) => {
      if (!isMyDefense) return;
      room.send("deflect", { suit: card.suit, rank: card.rank });
    },
    [room, isMyDefense],
  );

  const handleTakeCards = useCallback(() => {
    room.send("takeCards");
  }, [room]);

  const handlePass = useCallback(() => {
    room.send("pass");
  }, [room]);

  const hasPassed =
    canAddAttack &&
    Array.from(state.passedPlayers).includes(room.sessionId);

  // Build opponents in clockwise seating order starting from the player
  // to our left (the next seat after ours in turnOrder).
  const order = Array.from(state.turnOrder).filter((id): id is string => id != null);
  const myIdx = order.indexOf(room.sessionId);
  const rotated = myIdx === -1
    ? order
    : [...order.slice(myIdx + 1), ...order.slice(0, myIdx)];

  const otherPlayers = rotated
    .map((id) => [id, state.players.get(id)] as const)
    .filter((entry): entry is [string, NonNullable<typeof entry[1]>] => entry[1] != null);

  const toNode = ([sessionId, player]: (typeof otherPlayers)[number]) => {
    const role =
      sessionId === state.attackStatus.attacker.sessionId
        ? ("attacker" as const)
        : sessionId === state.attackStatus.defender.sessionId
          ? ("defender" as const)
          : undefined;
    return (
      <FaceDownHand
        key={sessionId}
        count={player.hand.length}
        label={player.name ?? "Anonymous"}
        role={role}
      />
    );
  };

  // Distribute opponents into left / top / right based on seating order.
  // Index 0 = immediate left neighbour, last = immediate right neighbour.
  let leftNode: React.ReactNode | undefined;
  let rightNode: React.ReactNode | undefined;
  let topNodes: React.ReactNode[];

  const n = otherPlayers.length;
  if (n <= 1) {
    topNodes = otherPlayers.map(toNode);
  } else {
    leftNode = toNode(otherPlayers[0]!);
    rightNode = toNode(otherPlayers[n - 1]!);
    topNodes = otherPlayers.slice(1, n - 1).map(toNode);
  }

  return (
    <section className={`space-y-6 max-w-6xl mx-auto${attackFlash ? " attack-flash" : ""}`}>
      <GameAnnouncement announcement={announcement} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-200">Game</h2>
        <button
          type="button"
          onClick={leave}
          className="px-4 py-2 rounded bg-slate-600 text-slate-200 font-medium hover:bg-slate-500"
        >
          Leave
        </button>
      </div>

      {isFinished ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <h3 className="text-2xl font-bold text-amber-400">Game Over</h3>
          {durakPlayer && (
            <p className="text-lg text-slate-300">
              <span className="font-semibold text-red-400">
                {durakPlayer.sessionId === room.sessionId
                  ? "You"
                  : durakPlayer.name}
              </span>{" "}
              {durakPlayer.sessionId === room.sessionId ? "are" : "is"} the
              Durak!
            </p>
          )}
          <div className="flex gap-3 mt-2">
            {isHost && (
              <button
                type="button"
                onClick={handlePlayAgain}
                className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold text-lg hover:bg-emerald-500 transition-colors"
              >
                Play Again
              </button>
            )}
            <button
              type="button"
              onClick={leave}
              className="px-6 py-3 rounded-lg bg-slate-600 text-slate-200 font-semibold text-lg hover:bg-slate-500 transition-colors"
            >
              Leave
            </button>
          </div>
          {!isHost && (
            <p className="text-slate-500 text-sm">
              Waiting for the host to start a new game...
            </p>
          )}
        </div>
      ) : (
        <GameTable
          left={leftNode}
          top={topNodes}
          right={rightNode}
          center={
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <DeckPlaceholder count={state.deck.length} />
                {hasTrump && <TrumpCard suit={trump.suit} rank={trump.rank} />}
              </div>
              <AttackStatusDisplay
                attackStatus={state.attackStatus}
                onDefend={isMyDefense ? handleDefend : undefined}
              />
            </div>
          }
          bottom={
            <div className="flex flex-col items-start gap-2">
              <Hand
                cards={handOrder}
                role={isMyAttack ? "attacker" : isMyDefense ? "defender" : undefined}
                label={
                  isMyAttack
                    ? "Your turn — pick a card to attack"
                    : isMyDefense
                      ? "Drag to defend · Click to deflect"
                      : isMyThrowIn
                        ? "Taking cards — waiting for others..."
                        : canAddAttack
                          ? "Click a card to pile on"
                          : "Your hand"
                }
                onCardClick={
                  isMyAttack || canAddAttack
                    ? handleCardClick
                    : isMyDefense
                      ? handleDeflect
                      : undefined
                }
                onReorder={autoSort ? undefined : handleReorder}
                onSort={handleSort}
                autoSort={autoSort}
              />
              {isMyDefense && (
                <button
                  type="button"
                  onClick={handleTakeCards}
                  disabled={!Array.from(state.attackStatus.pairs ?? []).some(
                    (p) => p?.attackingCard?.suit && !p?.defendingCard?.suit,
                  )}
                  className="px-4 py-2 rounded bg-red-600/80 text-white font-medium hover:bg-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600/80"
                >
                  Take Cards
                </button>
              )}
              {canAddAttack && (
                <button
                  type="button"
                  onClick={handlePass}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    hasPassed
                      ? "bg-amber-500 text-white hover:bg-amber-400"
                      : "bg-slate-600 text-slate-200 hover:bg-slate-500"
                  }`}
                >
                  {hasPassed ? "Passed — click to unpass" : "Pass"}
                </button>
              )}
            </div>
          }
        />
      )}
    </section>
  );
}
