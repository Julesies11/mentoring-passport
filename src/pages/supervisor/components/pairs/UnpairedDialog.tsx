import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { KeenIcon } from '@/components/keenicons';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';

interface UnpairedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: any[];
  pairs: any[];
  onPairNow: (participantId: string) => void;
}

const SortIcon = ({ field, currentField, currentOrder }: { field: string, currentField: string, currentOrder: 'asc' | 'desc' }) => {
  if (field !== currentField) return <KeenIcon icon="arrow-up-down" className="text-[10px] opacity-20 ml-1" />;
  return currentOrder === 'asc' 
    ? <KeenIcon icon="arrow-up" className="text-[10px] text-primary ml-1" />
    : <KeenIcon icon="arrow-down" className="text-[10px] text-primary ml-1" />;
};

export function UnpairedDialog({ open, onOpenChange, participants, pairs, onPairNow }: UnpairedDialogProps) {
  const [sortField, setSortField] = useState<string>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedUnpaired = useMemo(() => {
    const filtered = participants.filter(p => {
      const hasActiveMentorPair = pairs.some(pair => pair.mentor_id === p.id && pair.status === 'active');
      const hasActiveMenteePair = pairs.some(pair => pair.mentee_id === p.id && pair.status === 'active');
      return !hasActiveMentorPair && !hasActiveMenteePair && p.status === 'active';
    });

    return [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'department':
          aVal = (a.department || '').toLowerCase();
          bVal = (b.department || '').toLowerCase();
          break;
        case 'experience':
          aVal = (a.inactive_mentor_count || 0) + (a.inactive_mentee_count || 0);
          bVal = (b.inactive_mentor_count || 0) + (b.inactive_mentee_count || 0);
          break;
        case 'full_name':
        default:
          aVal = (a.full_name || a.email || '').toLowerCase();
          bVal = (b.full_name || b.email || '').toLowerCase();
          break;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [participants, pairs, sortField, sortOrder]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-5 border-b border-gray-100">
          <DialogTitle>Participants without Active Pairings</DialogTitle>
          <DialogDescription>
            Active program members who are not currently assigned as a mentor or mentee in any active pair.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto kt-scrollable-y-hover">
          {sortedUnpaired.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="check-circle" className="text-4xl mb-2 text-success opacity-20" />
              <p>All active participants are currently paired!</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-[350px] cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center">
                      Participant
                      <SortIcon field="full_name" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('department')}>
                    <div className="flex items-center">
                      Department
                      <SortIcon field="department" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('experience')}>
                    <div className="flex items-center">
                      Past Experience
                      <SortIcon field="experience" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUnpaired.map((participant) => (
                  <TableRow key={participant.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={getAvatarPublicUrl(participant.avatar_url, participant.id)} alt={participant.full_name || ''} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                            {getInitials(participant.full_name || participant.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">{participant.full_name || 'No name'}</span>
                          {participant.job_title && (
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">{participant.job_title}</span>
                          )}
                          <span className="text-xs text-muted-foreground">{participant.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-700">{participant.department || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className="h-5 px-1.5 bg-gray-50 text-gray-500 border-gray-200 text-[10px] font-bold">
                          Past Mnt: {participant.inactive_mentor_count}
                        </Badge>
                        <Badge variant="outline" className="h-5 px-1.5 bg-gray-50 text-gray-500 border-gray-200 text-[10px] font-bold">
                          Past Mte: {participant.inactive_mentee_count}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onPairNow(participant.id)}
                      >
                        <KeenIcon icon="plus" />
                        Pair Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
