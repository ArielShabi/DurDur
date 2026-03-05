import { CardDisplay } from "./CardDisplay";

interface TrumpCardProps {
  suit: string;
  rank: number;
}

export function TrumpCard({ suit, rank }: TrumpCardProps) {
  return (
    <div>
      <h3 className="text-slate-400 text-sm font-medium mb-2">Trump</h3>
      <CardDisplay suit={suit} rank={rank} />
    </div>
  );
}
