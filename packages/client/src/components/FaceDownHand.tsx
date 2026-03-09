import { FaceDownCard } from "./FaceDownCard";

interface FaceDownHandProps {
  /** Number of cards the player holds */
  count: number;
  /** Player name */
  label?: string;
  /** Active role in the current round */
  role?: "attacker" | "defender";
}

const MAX_VISIBLE_CARDS = 3;

export function FaceDownHand({ count, label, role }: FaceDownHandProps) {
  const visibleCount = Math.min(count, MAX_VISIBLE_CARDS);

  const roleStyle =
    role === "attacker"
      ? "ring-2 ring-red-500/70 bg-red-950/30"
      : role === "defender"
        ? "ring-2 ring-sky-500/70 bg-sky-950/30"
        : "";

  const labelStyle =
    role === "attacker"
      ? "text-red-400 font-semibold"
      : role === "defender"
        ? "text-sky-400 font-semibold"
        : "text-slate-400 font-medium";

  const roleLabel =
    role === "attacker" ? "Attacking" : role === "defender" ? "Defending" : null;

  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${roleStyle}`}>
      {label && (
        <span className={`text-sm truncate max-w-[8rem] ${labelStyle}`}>
          {label}
        </span>
      )}
      {roleLabel && (
        <span className={`text-xs ${role === "attacker" ? "text-red-500" : "text-sky-500"}`}>
          {roleLabel}
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
