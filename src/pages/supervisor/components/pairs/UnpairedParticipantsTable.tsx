import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { KeenIcon } from '@/components/keenicons';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';
import { ParticipantDialog } from '@/components/participants/participant-dialog';
import { Participant } from '@/lib/api/participants';
import { usePagination } from '@/hooks/use-pagination';
import { DataTablePagination } from '@/components/common/data-table-pagination';

interface UnpairedParticipantsTableProps {
  participants: any[];
  pairs: any[];
  programTitle?: string;
}

const SortIcon = ({ field, currentField, currentOrder }: { field: string, currentField: string, currentOrder: 'asc' | 'desc' }) => {
  if (field !== currentField) return <KeenIcon icon="arrow-up-down" className="text-[10px] opacity-20 ml-1" />;
  return currentOrder === 'asc' 
    ? <KeenIcon icon="arrow-up" className="text-[10px] text-primary ml-1" />
    : <KeenIcon icon="arrow-down" className="text-[10px] text-primary ml-1" />;
};

export function UnpairedParticipantsTable({ participants, pairs, programTitle }: UnpairedParticipantsTableProps) {
  const [sortField, setSortField] = useState<string>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Profile Dialog State
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleOpenProfile = (e: React.MouseEvent, participant: any) => {
    e.stopPropagation();
    if (!participant) return;
    setSelectedParticipant(participant as Participant);
    setIsProfileOpen(true);
  };

  const unpairedParticipants = useMemo(() => {
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

  const {
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedItems: paginatedUnpaired,
    goToNextPage,
    goToPrevPage,
    totalItems,
    startIndex,
    endIndex
  } = usePagination({
    items: unpairedParticipants,
    initialItemsPerPage: 50
  });

  return (
    <Card className="border-0 sm:border">
      <CardHeader className="px-3 sm:px-5 py-3 sm:py-4 min-h-0 sm:min-h-14 gap-2 sm:gap-2.5">
        <div className="flex flex-col">
          <CardTitle className="text-sm sm:text-base">Unpaired Participants</CardTitle>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Active members in {programTitle || 'this program'} without a pairing
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {unpairedParticipants.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <KeenIcon icon="check-circle" className="text-4xl mb-2 text-success opacity-20" />
            <p className="text-sm font-medium">All active participants in this program are currently paired!</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table className="table-fixed md:table-auto w-full min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%] md:w-auto cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('full_name')}>
                    <div className="flex items-center">
                      Participant
                      <SortIcon field="full_name" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('department')}>
                    <div className="flex items-center">
                      Department
                      <SortIcon field="department" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('experience')}>
                    <div className="flex items-center">
                      Past Experience
                      <SortIcon field="experience" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUnpaired.map((participant) => (
                  <TableRow 
                    key={participant.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={(e) => handleOpenProfile(e, participant)}
                  >
                    <TableCell className="overflow-hidden">
                      <div className="flex items-center gap-2 md:gap-3 group/member">
                        <Avatar className="size-7 md:size-8 shrink-0 group-hover/member:ring-2 group-hover/member:ring-primary/20 transition-all">
                          <AvatarImage src={getAvatarPublicUrl(participant.avatar_url, participant.id)} alt={participant.full_name || ''} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                            {getInitials(participant.full_name || participant.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-gray-900 text-xs md:text-sm truncate block group-hover/member:text-primary transition-colors">{participant.full_name || 'No name'}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-medium truncate block">{participant.job_title_name || 'N/A'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-gray-600 truncate block">{participant.department || '-'}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex gap-1.5 flex-wrap">
                        {(participant.inactive_mentor_count > 0 || participant.active_mentor_count > 0) && (
                          <Badge variant="outline" className="h-5 px-1.5 bg-purple-50 text-purple-600 border-purple-100 text-[9px] font-black uppercase tracking-tighter">
                            Mentor: {participant.inactive_mentor_count + participant.active_mentor_count}
                          </Badge>
                        )}
                        {(participant.inactive_mentee_count > 0 || participant.active_mentee_count > 0) && (
                          <Badge variant="outline" className="h-5 px-1.5 bg-blue-50 text-blue-600 border-blue-100 text-[9px] font-black uppercase tracking-tighter">
                            Mentee: {participant.inactive_mentee_count + participant.active_mentee_count}
                          </Badge>
                        )}
                        {participant.inactive_mentor_count === 0 && participant.inactive_mentee_count === 0 && 
                         participant.active_mentor_count === 0 && participant.active_mentee_count === 0 && (
                          <span className="text-[10px] text-gray-400 italic">No past pairings</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        className="h-8 text-[10px] font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProfile(e, participant);
                        }}
                      >
                        <KeenIcon icon="eye" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {unpairedParticipants.length > itemsPerPage && (
        <div className="border-t border-gray-100">
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            startIndex={startIndex}
            endIndex={endIndex}
            onItemsPerPageChange={setItemsPerPage}
            onPrevPage={goToPrevPage}
            onNextPage={goToNextPage}
          />
        </div>
      )}

      <ParticipantDialog
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        participant={selectedParticipant}
        onSubmit={async () => {}} // Read-only
        readOnly={true}
      />
    </Card>
  );
}
