interface FaceDownCardProps {
  className?: string;
}

/** A face-down card, same size as CardDisplay. Use for other players' hands. */
export function FaceDownCard({ className = "" }: FaceDownCardProps) {
  return (
    <div
      className={`
        relative flex items-center justify-center overflow-hidden rounded-xl border-2 border-slate-400/80
        w-14 h-20 min-w-[3.5rem]
        bg-gradient-to-br from-slate-700 to-slate-800 shadow-lg shadow-slate-900/25
        ${className}
      `}
    >
      {/* Card back pattern: diagonal stripes */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 3px,
            rgba(255,255,255,0.03) 3px,
            rgba(255,255,255,0.03) 6px
          )`,
        }}
      />
      {/* Inner border */}
      <div className="absolute inset-1 rounded-lg border border-slate-500/50" />
      {/* Center decoration */}
      <div className="h-8 w-8 rounded-full border-2 border-slate-500/50 bg-slate-600/30" />
    </div>
  );
}
