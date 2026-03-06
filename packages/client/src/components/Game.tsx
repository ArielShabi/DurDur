import { useCallback } from "react";
import { useGame } from "../context/GameContext";
import { TrumpCard } from "./TrumpCard";
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

  const handleCardClick = useCallback(
    (card: { suit: string; rank: number }) => {
      if (!isMyAttack) return;
      room.send("attack", { suit: card.suit, rank: card.rank });
    },
    [room, isMyAttack],
  );

  const handleDefend = useCallback(
    (card: { suit: string; rank: number }, pairIndex: number) => {
      if (!isMyDefense) return;
      room.send("defend", { suit: card.suit, rank: card.rank, pairIndex });
    },
    [room, isMyDefense],
  );

  const otherPlayers = Array.from(state.players.entries()).filter(
    ([sessionId]) => sessionId !== room.sessionId
  );
  const [topPlayer, leftPlayer, rightPlayer] = [
    otherPlayers[0],
    otherPlayers[1],
    otherPlayers[2],
  ];

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
        top={
          topPlayer ? (
            <FaceDownHand
              count={topPlayer[1].hand.length}
              label={topPlayer[1].name ?? "Anonymous"}
            />
          ) : (
            <span className="text-slate-500 text-sm">—</span>
          )
        }
        left={
          leftPlayer ? (
            <FaceDownHand
              count={leftPlayer[1].hand.length}
              label={leftPlayer[1].name ?? "Anonymous"}
              orientation="vertical"
            />
          ) : (
            <span className="text-slate-500 text-sm">—</span>
          )
        }
        right={
          rightPlayer ? (
            <FaceDownHand
              count={rightPlayer[1].hand.length}
              label={rightPlayer[1].name ?? "Anonymous"}
              orientation="vertical"
            />
          ) : (
            <span className="text-slate-500 text-sm">—</span>
          )
        }
        center={
          <AttackStatusDisplay
            attackStatus={state.attackStatus}
            onDefend={isMyDefense ? handleDefend : undefined}
          />
        }
        bottom={
          <Hand
            cards={myHand}
            label={
              isMyAttack
                ? "Your turn — pick a card to attack"
                : isMyDefense
                  ? "Drag a card onto an attacking card to defend"
                  : "Your hand"
            }
            onCardClick={isMyAttack ? handleCardClick : undefined}
            cardsDraggable={isMyDefense}
          />
        }
      />
    </section>
  );
}
