import { useState, useMemo } from 'react';
import { useOrganisation } from '@/providers/organisation-provider';
import { useOrgSupervisors } from '@/hooks/use-participants';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supervisor: any;
}

export function AssignmentDialog({
  open,
  onOpenChange,
  supervisor,
}: AssignmentDialogProps) {
  const { programs } = useOrganisation();
  const { assignToProgram, removeFromProgram } = useOrgSupervisors();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPrograms = useMemo(() => {
    if (!searchTerm) return programs;
    return programs.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [programs, searchTerm]);

  const isAssigned = (programId: string) => {
    return supervisor.assigned_program_ids?.includes(programId);
  };

  const handleToggle = async (programId: string, currentlyAssigned: boolean) => {
    setProcessingId(programId);
    try {
      if (currentlyAssigned) {
        await removeFromProgram({ userId: supervisor.id, programId });
        toast.success('Program removed from supervisor');
      } else {
        await assignToProgram({ userId: supervisor.id, programId });
        toast.success('Program assigned to supervisor');
      }
    } catch (error) {
      toast.error('Failed to update assignment');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] w-[calc(100%-32px)] p-0 overflow-hidden flex flex-col rounded-2xl border-none shadow-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 shrink-0 border-b border-gray-100 bg-gray-50/50">
          <DialogTitle className="text-xl font-bold tracking-tight text-gray-900">Assign Programs</DialogTitle>
          <DialogDescription className="text-xs font-medium text-gray-500 mt-1">
            Setting program access for <span className="font-bold text-gray-800">{supervisor.full_name || supervisor.email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pb-2">
          <div className="relative mb-4">
            <KeenIcon icon="magnifier" className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-gray-50/50 border-gray-200 rounded-xl"
            />
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
            <ScrollArea className="h-[300px]">
              <div className="divide-y divide-gray-50">
                {filteredPrograms.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center gap-2">
                    <KeenIcon icon="search-list" className="text-4xl text-gray-200" />
                    <p className="text-sm font-medium text-gray-500">No programs found</p>
                  </div>
                ) : (
                  filteredPrograms.map((program) => {
                    const assigned = isAssigned(program.id);
                    const isProcessing = processingId === program.id;

                    return (
                      <div 
                        key={program.id} 
                        className={cn(
                          "flex items-center justify-between p-4 transition-colors",
                          assigned ? "bg-primary-light/5" : "hover:bg-gray-50"
                        )}
                      >
                        <div className="flex flex-col gap-1 min-w-0 mr-4">
                          <span className="text-sm font-bold text-gray-900 truncate">{program.name}</span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "w-fit text-[9px] font-black uppercase px-2 py-0 border-none h-4",
                              program.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                            )}
                          >
                            {program.status}
                          </Badge>
                        </div>
                        
                        <div className="shrink-0 flex items-center gap-3">
                          {isProcessing && <KeenIcon icon="loading" className="animate-spin text-primary" />}
                          <Switch 
                            checked={assigned} 
                            onCheckedChange={() => handleToggle(program.id, assigned)}
                            disabled={isProcessing || program.status === 'archived'}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t border-gray-100 bg-gray-50/30">
          <Button type="button" onClick={() => onOpenChange(false)} className="w-full rounded-xl font-bold text-sm h-11 shadow-lg shadow-primary/20">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
