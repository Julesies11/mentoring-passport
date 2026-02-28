import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PairsStatsProps {
  stats: any;
  unpairedCount: number;
  filterStatus: string;
  onFilterChange: (status: any) => void;
  onShowUnpaired: () => void;
}

export function PairsStats({ 
  stats, 
  unpairedCount, 
  filterStatus, 
  onFilterChange,
  onShowUnpaired 
}: PairsStatsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-300 hover:shadow-md border-2",
          filterStatus === 'all' 
            ? "border-zinc-800 bg-zinc-900 shadow-lg" 
            : "bg-white border-transparent hover:border-zinc-300/30 hover:bg-zinc-50"
        )}
        onClick={() => onFilterChange('all')}
      >
        <CardContent className="p-3">
          <p className={cn(
            "text-[10px] mb-0.5 font-bold uppercase tracking-wider transition-colors",
            filterStatus === 'all' ? "text-white" : "text-muted-foreground"
          )}>All Pairs</p>
          <p className={cn(
            "text-xl font-black transition-colors",
            filterStatus === 'all' ? "text-white" : "text-zinc-900"
          )}>{stats.total}</p>
        </CardContent>
      </Card>

      <Card 
        className={cn(
          "cursor-pointer transition-all duration-300 hover:shadow-md border-2",
          filterStatus === 'active' 
            ? "border-success bg-success shadow-lg" 
            : "bg-white border-transparent hover:border-success/30 hover:bg-success-light"
        )}
        onClick={() => onFilterChange('active')}
      >
        <CardContent className="p-3">
          <p className={cn(
            "text-[10px] mb-0.5 font-bold uppercase tracking-wider transition-colors",
            filterStatus === 'active' ? "text-white" : "text-muted-foreground"
          )}>Active</p>
          <p className={cn(
            "text-xl font-black transition-colors",
            filterStatus === 'active' ? "text-white" : "text-success"
          )}>{stats.active}</p>
        </CardContent>
      </Card>
      
      <Card 
        className={cn(
          "cursor-pointer transition-all duration-300 hover:shadow-md border-2",
          filterStatus === 'completed' 
            ? "border-primary bg-primary shadow-lg" 
            : "bg-white border-transparent hover:border-primary/30 hover:bg-primary/5"
        )}
        onClick={() => onFilterChange('completed')}
      >
        <CardContent className="p-3">
          <p className={cn(
            "text-[10px] mb-0.5 font-bold uppercase tracking-wider transition-colors",
            filterStatus === 'completed' ? "text-white" : "text-muted-foreground"
          )}>Completed</p>
          <p className={cn(
            "text-xl font-black transition-colors",
            filterStatus === 'completed' ? "text-white" : "text-primary"
          )}>{stats.completed}</p>
        </CardContent>
      </Card>

      <Card 
        className={cn(
          "cursor-pointer transition-all duration-300 hover:shadow-md border-2",
          filterStatus === 'archived' 
            ? "border-zinc-800 bg-zinc-800 shadow-lg" 
            : "bg-white border-transparent hover:border-zinc-300/30 hover:bg-zinc-50"
        )}
        onClick={() => onFilterChange('archived')}
      >
        <CardContent className="p-3">
          <p className={cn(
            "text-[10px] mb-0.5 font-bold uppercase tracking-wider transition-colors",
            filterStatus === 'archived' ? "text-white" : "text-muted-foreground"
          )}>Archived</p>
          <p className={cn(
            "text-xl font-black transition-colors",
            filterStatus === 'archived' ? "text-white" : "text-zinc-800"
          )}>{stats.archived}</p>
        </CardContent>
      </Card>

      <Card 
        className="cursor-pointer transition-all duration-300 hover:shadow-md border-2 border-transparent bg-white hover:border-warning/30 hover:bg-warning-light"
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
