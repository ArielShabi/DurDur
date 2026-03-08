import { CardDisplay } from "./CardDisplay";

interface CardLike {
  suit: string;
  rank: number;
}

interface HandProps {
  cards: CardLike[];
  /** Optional label above the hand */
  label?: string;
  onCardClick?: (card: CardLike) => void;
  cardsDraggable?: boolean;
}

export function Hand({ cards, label, onCardClick, cardsDraggable }: HandProps) {  
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
            <CardDisplay
              key={i}
              suit={card.suit}
              rank={card.rank}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
              draggable={cardsDraggable}
              onDragStart={
                cardsDraggable
                  ? (e) => e.dataTransfer.setData("application/json", JSON.stringify(card))
                  : undefined
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
