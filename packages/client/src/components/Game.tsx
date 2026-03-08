import { useCallback } from "react";
import { useGame } from "../context/GameContext";
import { TrumpCard } from "./TrumpCard";
import { DeckPlaceholder } from "./DeckPlaceholder";
import { Hand } from "./Hand";
import { FaceDownHand } from "./FaceDownHand";
import { GameTable } from "./GameTable";
import { AttackStatusDisplay } from "./AttackStatusDisplay";

export function Game() {
  const { room, leave } = useGame();
  const state = room?.state;

  if (!room || !state) return null;

  const myPlayer = state.players.get(room.sessionId);
  const myHand = myPlayer
    ? Array.from(myPlayer.hand)
        .filter((c) => c != null)
        .map((c) => ({ suit: c.suit, rank: c.rank }))
    : [];
  const trump = state.trumpCard;

  const isMyAttack =
    state.currentPhase === "attacking" &&
    state.attackStatus.attacker.sessionId === room.sessionId;

  const isMyDefense =
    state.currentPhase === "defending" &&
    state.attackStatus.defender.sessionId === room.sessionId;

  const canAddAttack =
    state.currentPhase === "defending" && !isMyDefense;

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

  const toNode = ([sessionId, player]: (typeof otherPlayers)[number]) => (
    <FaceDownHand
      key={sessionId}
      count={player.hand.length}
      label={player.name ?? "Anonymous"}
    />
  );

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
    <section className="space-y-6 max-w-6xl">
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

      <GameTable
        left={leftNode}
        top={topNodes}
        right={rightNode}
        center={
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <DeckPlaceholder count={state.deck.length} />
              {trump && <TrumpCard suit={trump.suit} rank={trump.rank} />}
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
              cards={myHand}
              label={
                isMyAttack
                  ? "Your turn — pick a card to attack"
                  : isMyDefense
                    ? "Drag to defend · Click to deflect"
                    : canAddAttack
                      ? "Click a card to pile on an attack"
                      : "Your hand"
              }
              onCardClick={
                isMyAttack || canAddAttack
                  ? handleCardClick
                  : isMyDefense
                    ? handleDeflect
                    : undefined
              }
              cardsDraggable={isMyDefense}
            />
            {isMyDefense && (
              <button
                type="button"
                onClick={handleTakeCards}
                className="px-4 py-2 rounded bg-red-600/80 text-white font-medium hover:bg-red-500 transition-colors"
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
    </section>
  );
}
