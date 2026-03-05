import { type ReactNode } from "react";

interface GameTableProps {
  /** Opponent at top (across from you) */
  top: ReactNode;
  /** Opponent on the left */
  left: ReactNode;
  /** Opponent on the right */
  right: ReactNode;
  /** Center area: trump, table cards, etc. */
  center: ReactNode;
  /** Your hand at the bottom */
  bottom: ReactNode;
}

/**
 * Lays out the game in a square table: top / left | center | right / bottom.
 * Your hand is always at the bottom.
 */
export function GameTable({ top, left, center, right, bottom }: GameTableProps) {
  return (
    <div
      className="grid w-full max-w-5xl mx-auto gap-6"
      style={{
        gridTemplateColumns: "minmax(140px, 1fr) minmax(10rem, auto) minmax(140px, 1fr)",
        gridTemplateRows: "minmax(100px, auto) minmax(220px, 1fr) minmax(120px, auto)",
        gridTemplateAreas: `
          "top     top     top"
          "left   center  right"
          "bottom bottom bottom"
        `,
        minHeight: "540px",
      }}
    >
      <div className="flex justify-center items-end pb-3 min-h-[100px]" style={{ gridArea: "top" }}>
        {top}
      </div>
      <div className="flex justify-end items-center pr-3 min-w-0 overflow-hidden" style={{ gridArea: "left" }}>
        <div className="inline-flex justify-center items-center" style={{ transform: "rotate(-90deg)" }}>
          {left}
        </div>
      </div>
      <div
        className="flex justify-center items-center p-6 rounded-xl bg-slate-800/50 border border-slate-700/50 min-w-[10rem] min-h-[8rem]"
        style={{ gridArea: "center" }}
      >
        {center}
      </div>
      <div className="flex justify-start items-center pl-3 min-w-0 overflow-hidden" style={{ gridArea: "right" }}>
        <div className="inline-flex justify-center items-center" style={{ transform: "rotate(90deg)" }}>
          {right}
        </div>
      </div>
      <div className="flex justify-center items-start pt-3 min-h-[120px]" style={{ gridArea: "bottom" }}>
        {bottom}
      </div>
    </div>
  );
}
