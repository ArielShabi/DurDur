import type { AttackStatus as AttackStatusSchema } from "@durak/schema";
import { CardDisplay } from "./CardDisplay";

const MAX_PAIRS = 6;

interface AttackStatusDisplayProps {
  attackStatus: AttackStatusSchema;
}

export function AttackStatusDisplay({ attackStatus }: AttackStatusDisplayProps) {
  const pairs = Array.from(attackStatus.pairs ?? []);
  const slots = Array.from({ length: MAX_PAIRS }, (_, i) => pairs[i] ?? null);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4 text-slate-400 text-sm">
        <span>Attacker: {attackStatus.attacker?.name ?? "—"}</span>
        <span>Defender: {attackStatus.defender?.name ?? "—"}</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {slots.map((pair, i) => (
          <div
            key={i}
            className="flex items-center gap-1 rounded-lg border border-slate-600/60 bg-slate-800/40 p-1.5 min-w-[7rem]"
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
        ))}
      </div>
    </div>
  );
}
