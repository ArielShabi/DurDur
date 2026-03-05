import { CardDisplay } from "./CardDisplay";

interface CardLike {
  suit: string;
  rank: string;
}

interface HandProps {
  cards: CardLike[];
  /** Optional label above the hand */
  label?: string;
}

export function Hand({ cards, label }: HandProps) {
  return (
    <div>
      {label && (
        <h3 className="text-slate-400 text-sm font-medium mb-2">{label}</h3>
      )}
      <div className="flex flex-wrap gap-2">
        {cards.length === 0 ? (
          <span className="text-slate-500 text-sm">No cards</span>
        ) : (
          cards.map((card, i) => (
            <CardDisplay key={i} suit={card.suit} rank={card.rank} />
          ))
        )}
      </div>
    </div>
  );
}
