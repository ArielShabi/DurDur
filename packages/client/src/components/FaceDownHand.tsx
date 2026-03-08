import { FaceDownCard } from "./FaceDownCard";

interface FaceDownHandProps {
  /** Number of cards the player holds */
  count: number;
  /** Player name */
  label?: string;
}

const MAX_VISIBLE_CARDS = 3;

export function FaceDownHand({ count, label }: FaceDownHandProps) {
  const visibleCount = Math.min(count, MAX_VISIBLE_CARDS);

  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-slate-400 text-sm font-medium truncate max-w-[8rem]">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        <div className="flex" style={{ marginRight: visibleCount > 1 ? 0 : undefined }}>
          {Array.from({ length: visibleCount }, (_, i) => (
            <div
              key={i}
              style={{ marginLeft: i === 0 ? 0 : -24 }}
            >
              <FaceDownCard />
            </div>
          ))}
        </div>
        <span className="text-slate-300 text-base font-semibold tabular-nums min-w-[1.5rem] text-center">
          {count}
        </span>
      </div>
    </div>
  );
}
