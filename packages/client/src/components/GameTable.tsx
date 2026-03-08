import { type ReactNode } from "react";

interface GameTableProps {
  /** Opponent on the left side */
  left?: ReactNode;
  /** Opponents across the top (0-3 items) */
  top: ReactNode[];
  /** Opponent on the right side */
  right?: ReactNode;
  /** Center area: trump, table cards, etc. */
  center: ReactNode;
  /** Your hand at the bottom */
  bottom: ReactNode;
}

/**
 * Lays out the game in a table shape: top row / left | center | right / bottom.
 * Supports 1-5 opponents distributed across the three positional slots.
 */
export function GameTable({ left, top, right, center, bottom }: GameTableProps) {
  return (
    <div
      className="grid w-full max-w-5xl mx-auto gap-y-4 gap-x-10"
      style={{
        gridTemplateColumns: "minmax(100px, 1fr) minmax(10rem, auto) minmax(100px, 1fr)",
        gridTemplateRows: "auto minmax(220px, 1fr) auto",
        gridTemplateAreas: `
          "top     top     top"
          "left   center  right"
          "bottom bottom bottom"
        `,
        minHeight: "540px",
      }}
    >
      <div
        className="flex justify-center items-end gap-8 pb-3 min-h-[100px]"
        style={{ gridArea: "top" }}
      >
        {top.map((node, i) => (
          <div key={i} className="flex-shrink-0">
            {node}
          </div>
        ))}
      </div>

      <div
        className="flex justify-center items-center min-w-0 p-6"
        style={{ gridArea: "left" }}
      >
        {left}
      </div>

      <div
        className="flex justify-center items-center c p-1 rounded-xl bg-slate-800/50 border border-slate-700/50 min-w-[10rem] min-h-[8rem]"
        style={{ gridArea: "center" }}
      >
        {center}
      </div>

      <div
        className="flex justify-center items-center min-w-0"
        style={{ gridArea: "right" }}
      >
        {right}
      </div>

      <div
        className="flex justify-center items-start pt-3 min-h-[120px]"
        style={{ gridArea: "bottom" }}
      >
        {bottom}
      </div>
    </div>
  );
}
