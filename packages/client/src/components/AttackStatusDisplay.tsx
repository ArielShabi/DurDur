import { useState } from "react";
import type { AttackStatus as AttackStatusSchema } from "@durak/schema";
import { CardDisplay } from "./CardDisplay";

const MAX_PAIRS = 6;

interface AttackStatusDisplayProps {
  attackStatus: AttackStatusSchema;
  onDefend?: (card: { suit: string; rank: number }, pairIndex: number) => void;
}

export function AttackStatusDisplay({ attackStatus, onDefend }: AttackStatusDisplayProps) {
  const pairs = Array.from(attackStatus.pairs ?? []);
  const slots = Array.from({ length: MAX_PAIRS }, (_, i) => pairs[i] ?? null);

  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isUndefended = (slotIndex: number) => {
    const pair = pairs[slotIndex];
    return pair && (!pair.defendingCard?.suit && !pair.defendingCard?.rank);
  };

  const handleDragOver = (e: React.DragEvent, slotIndex: number) => {
    if (!onDefend || !isUndefended(slotIndex)) return;
    e.preventDefault();
    setDragOverIndex(slotIndex);
  };

  const handleDragLeave = () => setDragOverIndex(null);

  const handleDrop = (e: React.DragEvent, slotIndex: number) => {
    setDragOverIndex(null);
    if (!onDefend || !isUndefended(slotIndex)) return;
    e.preventDefault();
    try {
      const card = JSON.parse(e.dataTransfer.getData("application/json"));
      onDefend(card, slotIndex);
    } catch { /* invalid data, ignore */ }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 text-slate-400 text-sm">
        <span>Attacker: {attackStatus.attacker?.name ?? "—"}</span>
        <span>Defender: {attackStatus.defender?.name ?? "—"}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {slots.map((pair, i) => {
          const droppable = onDefend && isUndefended(i);
          const hovering = dragOverIndex === i;
          return (
            <div
              key={i}
              className={`
                flex items-center gap-1 rounded-lg border p-1.5 min-w-[7rem]
                transition-colors
                ${hovering ? "border-amber-400 bg-amber-400/10" : "border-slate-600/60 bg-slate-800/40"}
                ${droppable ? "ring-1 ring-dashed ring-slate-500/40" : ""}
              `}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, i)}
            >
              <CardDisplay
                suit={pair?.attackingCard?.suit ?? ""}
                rank={pair?.attackingCard?.rank ?? 0}
                className="flex-shrink-0"
              />
              <span className="text-slate-500 text-xs">→</span>
              <CardDisplay
                suit={pair?.defendingCard?.suit ?? ""}
                rank={pair?.defendingCard?.rank ?? 0}
                className="flex-shrink-0"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
