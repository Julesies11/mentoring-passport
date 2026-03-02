import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PairsStatsProps {
  stats: any;
  unpairedCount: number;
  onShowUnpaired: () => void;
}

export function PairsStats({ 
  stats, 
  unpairedCount, 
  onShowUnpaired 
}: PairsStatsProps) {
  if (!stats) return null;

  return (
    <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card 
        className="bg-white border-2 border-transparent hover:border-zinc-300/30 hover:bg-zinc-50 transition-all duration-300 shadow-sm"
      >
        <CardContent className="p-3">
          <p className="text-[10px] mb-0.5 font-bold uppercase tracking-wider text-muted-foreground">All Pairs</p>
          <p className="text-xl font-black text-zinc-900">{stats.total}</p>
        </CardContent>
      </Card>

      <Card 
        className="bg-white border-2 border-transparent hover:border-success/30 hover:bg-success-light transition-all duration-300 shadow-sm"
      >
        <CardContent className="p-3">
          <p className="text-[10px] mb-0.5 font-bold uppercase tracking-wider text-muted-foreground">Active</p>
          <p className="text-xl font-black text-success">{stats.active}</p>
        </CardContent>
      </Card>
      
      <Card 
        className="bg-white border-2 border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 shadow-sm"
      >
        <CardContent className="p-3">
          <p className="text-[10px] mb-0.5 font-bold uppercase tracking-wider text-muted-foreground">Completed</p>
          <p className="text-xl font-black text-primary">{stats.completed}</p>
        </CardContent>
      </Card>

      <Card 
        className="bg-white border-2 border-transparent hover:border-zinc-300/30 hover:bg-zinc-50 transition-all duration-300 shadow-sm"
      >
        <CardContent className="p-3">
          <p className="text-[10px] mb-0.5 font-bold uppercase tracking-wider text-muted-foreground">Archived</p>
          <p className="text-xl font-black text-zinc-800">{stats.archived}</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer transition-all duration-300 hover:shadow-md border-2 border-transparent bg-white hover:border-warning/30 hover:bg-warning-light shadow-sm"
        onClick={onShowUnpaired}
      >
        <CardContent className="p-3">
          <p className="text-[10px] mb-0.5 font-bold uppercase tracking-wider text-muted-foreground">Unpaired</p>
          <p className="text-xl font-black text-warning">{unpairedCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
