import { useState } from "react";
import { CardDisplay } from "./CardDisplay";

interface CardLike {
  suit: string;
  rank: number;
}

interface HandProps {
  cards: CardLike[];
  label?: string;
  onCardClick?: (card: CardLike) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onSort?: () => void;
  autoSort?: boolean;
}

export function Hand({ cards, label, onCardClick, onReorder, onSort, autoSort }: HandProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number, card: CardLike) => {
    setDragIndex(index);
    e.dataTransfer.setData("application/json", JSON.stringify(card));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    e.preventDefault();
    setDropIndex(index);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setDropIndex(null);
    if (dragIndex !== null && dragIndex !== toIndex) {
      onReorder?.(dragIndex, toIndex);
    }
    setDragIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
      {onSort && (
          <button
            type="button"
            onClick={onSort}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              autoSort
                ? "bg-amber-600 text-white hover:bg-amber-500"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
            title={autoSort ? "Auto-sort is on — click to disable" : "Sort by suit and rank (click to toggle auto-sort)"}
          >
            {autoSort ? "Auto-sort ✓" : "Sort"}
          </button>
        )}
        {label && (
          <h3 className="text-slate-400 text-sm font-medium">{label}</h3>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {cards.length === 0 ? (
          <span className="text-slate-500 text-sm">No cards</span>
        ) : (
          cards.map((card, i) => (
            <div
              key={`${card.suit}-${card.rank}`}
              className={`animate-deal-in transition-all duration-150 ${
                dropIndex === i ? "ring-2 ring-amber-400 rounded-xl scale-105" : ""
              } ${dragIndex === i ? "opacity-30" : ""}`}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragLeave={() => setDropIndex(null)}
              onDrop={(e) => handleDrop(e, i)}
            >
              <CardDisplay
                suit={card.suit}
                rank={card.rank}
                onClick={onCardClick ? () => onCardClick(card) : undefined}
                draggable
                onDragStart={(e) => handleDragStart(e, i, card)}
                onDragEnd={handleDragEnd}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
