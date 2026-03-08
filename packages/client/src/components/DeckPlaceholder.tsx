import { FaceDownCard } from "./FaceDownCard";

interface DeckPlaceholderProps {
  count: number;
}

/** Stacked face-down cards representing the draw deck with a card count badge. */
export function DeckPlaceholder({ count }: DeckPlaceholderProps) {
  if (count === 0) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="w-14 h-20 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/30 flex items-center justify-center">
          <span className="text-slate-600 text-xs">Empty</span>
        </div>
        <span className="text-slate-500 text-xs font-medium">Deck</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        {count >= 3 && (
          <FaceDownCard className="absolute top-0 left-0 translate-x-1 translate-y-1 opacity-40" />
        )}
        {count >= 2 && (
          <FaceDownCard className="absolute top-0 left-0 translate-x-0.5 translate-y-0.5 opacity-60" />
        )}
        <FaceDownCard className="relative" />
        <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
          {count}
        </div>
      </div>
      <span className="text-slate-500 text-xs font-medium">Deck</span>
    </div>
  );
}
