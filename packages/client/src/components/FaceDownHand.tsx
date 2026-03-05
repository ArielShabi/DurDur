import { FaceDownCard } from "./FaceDownCard";

interface FaceDownHandProps {
  /** Number of face-down cards to show */
  count: number;
  /** Optional label (e.g. player name) */
  label?: string;
  /** "horizontal" for bottom/top, "vertical" for left/right sides */
  orientation?: "horizontal" | "vertical";
}

/** A hand of face-down cards for other players. */
export function FaceDownHand({ count, label, orientation = "horizontal" }: FaceDownHandProps) {
  const isVertical = orientation === "vertical";
  return (
    <div className={isVertical ? "flex flex-col items-center" : ""}>
      {label && (
        <h3 className={`text-slate-400 text-sm font-medium ${isVertical ? "mb-2" : "mb-2"}`}>
          {label}
        </h3>
      )}
      <div
        className={
          isVertical ? "flex flex-col flex-wrap max-h-40 overflow-auto" : "flex flex-wrap"
        }
      >
        {Array.from({ length: count }, (_, i) => (
          <FaceDownCard key={i} />
        ))}
      </div>
    </div>
  );
}
