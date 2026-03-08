interface CardDisplayProps {
  suit: string;
  rank: number;
  className?: string;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

const SUIT_MAP: Record<string, { symbol: string; color: "red" | "black" }> = {
  hearts: { symbol: "♥", color: "red" },
  diamonds: { symbol: "♦", color: "red" },
  clubs: { symbol: "♣", color: "black" },
  spades: { symbol: "♠", color: "black" },
};

function SuitSymbol({ suit, size = 24 }: { suit: string; size?: number }) {
  const info = SUIT_MAP[suit.toLowerCase()] ?? { symbol: "?", color: "black" as const };
  return (
    <span
      className={info.color === "red" ? "text-red-600" : "text-slate-800"}
      style={{ fontSize: size }}
    >
      {info.symbol}
    </span>
  );
}

function rankToString(rank: number | undefined): string {
  if (rank == null) return "";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  if (rank === 14) return "A";
  return rank.toString();
}

export function CardDisplay({ suit, rank, className = "", onClick, draggable, onDragStart, onDragEnd }: CardDisplayProps) {
  const isEmpty = !suit && !rank;
  const info = suit ? SUIT_MAP[suit.toLowerCase()] ?? { symbol: "?", color: "black" as const } : null;
  const rankString = rankToString(rank);
  if (isEmpty) {
    return (
      <div
        className={`
          flex items-center justify-center rounded-xl border-2 border-dashed border-slate-600
          bg-slate-800/50 text-slate-500 font-medium w-16 h-24 min-w-[4rem]
          ${className}
        `}
        style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
      >
        —
      </div>
    );
  }

  const isRed = info?.color === "red";

  return (
    <div
      className={`
        relative flex flex-col rounded-xl border-2 border-slate-300/90
        bg-white shadow-lg shadow-slate-900/25 w-16 h-24 min-w-[4rem]
        transition-transform hover:-translate-y-1 hover:shadow-xl
        ${onClick ? "cursor-pointer ring-amber-400 hover:ring-2" : ""}
        ${draggable ? "cursor-grab active:cursor-grabbing" : ""}
        ${className}
      `}
      style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Top-left corner */}
      <div className="absolute left-1 top-0.5 flex flex-col items-center leading-tight">
        <span className={`text-sm font-bold ${isRed ? "text-red-600" : "text-slate-800"}`}>
          {rankString}
        </span>
        <SuitSymbol suit={suit} size={10} />
      </div>

      {/* Center */}
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center -gap-0.5">
          <span className={`text-2xl font-bold leading-none ${isRed ? "text-red-600" : "text-slate-800"}`}>
            {rankString}
          </span>
          <SuitSymbol suit={suit} size={22} />
        </div>
      </div>

      {/* Bottom-right corner (rotated) */}
      <div className="absolute bottom-0.5 right-1 flex flex-col items-center leading-tight rotate-180">
        <span className={`text-sm font-bold ${isRed ? "text-red-600" : "text-slate-800"}`}>
          {rankString}
        </span>
        <SuitSymbol suit={suit} size={10} />
      </div>
    </div>
  );
}
