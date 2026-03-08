interface DeckPlaceholderProps {
  count: number;
}

export function DeckPlaceholder({ count }: DeckPlaceholderProps) {
  if (count === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-16 h-24 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/30 flex items-center justify-center">
          <span className="text-slate-600 text-xs">Empty</span>
        </div>
        <span className="text-slate-500 text-xs font-medium">Deck</span>
      </div>
    );
  }

  const layers = Math.min(count, 4);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-16 h-24">
        {/* Stacked bottom layers — thin colored edges to simulate deck depth */}
        {layers >= 4 && (
          <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-xl bg-slate-600 border border-slate-500/40" />
        )}
        {layers >= 3 && (
          <div className="absolute inset-0 translate-x-[2px] translate-y-[2px] rounded-xl bg-slate-650 border border-slate-500/50 bg-slate-700" />
        )}
        {layers >= 2 && (
          <div className="absolute inset-0 translate-x-[1px] translate-y-[1px] rounded-xl bg-slate-700 border border-slate-500/60" />
        )}

        {/* Top card */}
        <div
          className="relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-slate-400/80 w-full h-full bg-gradient-to-br from-slate-600 to-slate-800 shadow-md"
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `repeating-linear-gradient(
                135deg,
                transparent,
                transparent 4px,
                rgba(255,255,255,0.06) 4px,
                rgba(255,255,255,0.06) 8px
              )`,
            }}
          />
          <div className="absolute inset-1.5 rounded-lg border border-slate-400/30" />
          <div className="h-7 w-7 rounded-full border-2 border-slate-400/40 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-slate-400/20" />
          </div>
        </div>

        {/* Count badge */}
        <div className="absolute -top-2 -right-2 bg-amber-500 text-slate-900 text-xs font-bold rounded-full min-w-[1.5rem] h-6 px-1.5 flex items-center justify-center shadow-lg shadow-amber-500/30">
          {count}
        </div>
      </div>
      <span className="text-slate-500 text-xs font-medium">Deck</span>
    </div>
  );
}
