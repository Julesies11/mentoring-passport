import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/search-input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';
import { useAllPairTaskStatuses } from '@/hooks/use-tasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { PAIR_STATUS_COLORS } from '@/config/constants';
import { calculatePairProgress } from '@/lib/utils/progress';
import { usePagination } from '@/hooks/use-pagination';
import { DataTablePagination } from '@/components/common/data-table-pagination';
import { ParticipantDialog } from '@/components/participants/participant-dialog';
import { Participant } from '@/lib/api/participants';
import { Program } from '@/lib/api/programs';

const SortIcon = ({ field, currentField, currentOrder }: { field: string, currentField: string, currentOrder: 'asc' | 'desc' }) => {
  if (field !== currentField) return <KeenIcon icon="arrow-up-down" className="text-[10px] opacity-20 ml-1" />;
  return currentOrder === 'asc' 
    ? <KeenIcon icon="arrow-up" className="text-[10px] text-primary ml-1" />
    : <KeenIcon icon="arrow-down" className="text-[10px] text-primary ml-1" />;
};

interface PairsTableProps {
  pairs: any[];
  isLoading: boolean;
  onShowMatchmaker: () => void;
  activeProgram?: Program | null;
  mode?: 'supervisor' | 'org-admin';
}

export function PairsManagementTable({ pairs, isLoading, onShowMatchmaker, activeProgram, mode = 'supervisor' }: PairsTableProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Profile Dialog State
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { data: allStatuses = [] } = useAllPairTaskStatuses();

  // Determine base path for navigation
  const basePath = mode === 'org-admin' ? '/admin' : '/supervisor';

  // If we are on mobile and status is 'all', force it to 'active'
  useEffect(() => {
    if (isMobile && filterStatus === 'all') {
      setFilterStatus('active');
    }
  }, [isMobile, filterStatus]);

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

  const sortedPairs = useMemo(() => {
    const filtered = pairs.filter((pair) => {
      const mentorName = pair.mentor?.full_name || '';
      const menteeName = pair.mentee?.full_name || '';
      const mentorEmail = pair.mentor?.email || '';
      const menteeEmail = pair.mentee?.email || '';

      const matchesSearch =
        mentorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        menteeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mentorEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        menteeEmail.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = filterStatus === 'all' || pair.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    return [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'mentor':
          aVal = (a.mentor?.full_name || a.mentor?.email || '').toLowerCase();
          bVal = (b.mentor?.full_name || b.mentor?.email || '').toLowerCase();
          break;
        case 'mentee':
          aVal = (a.mentee?.full_name || a.mentee?.email || '').toLowerCase();
          bVal = (b.mentee?.full_name || b.mentee?.email || '').toLowerCase();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'progress':
          const aProg = calculatePairProgress(a.id, allStatuses);
          const bProg = calculatePairProgress(b.id, allStatuses);
          // Sort by completion percentage
          aVal = aProg.percentage;
          bVal = bProg.percentage;
          break;
        case 'created_at':
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [pairs, searchQuery, filterStatus, sortField, sortOrder, allStatuses]);

  // Use centralized pagination hook
  const {
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedItems: paginatedPairs,
    goToNextPage,
    goToPrevPage,
    goToPage,
    totalItems,
    startIndex,
    endIndex
  } = usePagination({
    items: sortedPairs,
    initialItemsPerPage: 10
  });

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    goToPage(1);
  }, [searchQuery, filterStatus, goToPage]);

  return (
    <Card className="border-0 sm:border">
      <CardHeader className="px-3 sm:px-5 py-3 sm:py-4 min-h-0 sm:min-h-14 gap-2 sm:gap-2.5">
        <CardTitle className="text-sm sm:text-base">
          {mode === 'org-admin' ? 'Organisation Pairs' : 'Mentoring Pairings'}
        </CardTitle>
        <CardToolbar className="w-full sm:w-auto mt-1 sm:mt-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <SearchInput
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              containerClassName="w-full sm:w-[200px] lg:w-[300px]"
              className="h-8 sm:h-9"
            />
            
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger aria-label="Filter by Status" size="sm" className="h-8 sm:h-8.5 w-full sm:w-[120px] text-[10px] sm:text-[0.8125rem]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {!isMobile && <SelectItem value="all">All Statuses</SelectItem>}
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              {mode === 'supervisor' && (
                <Button 
                  size="sm" 
                  onClick={onShowMatchmaker} 
                  className="h-8 sm:h-9 shrink-0 text-[10px] sm:text-xs"
                  disabled={!activeProgram}
                >
                  <KeenIcon icon="plus-squared" />
                  <span className="hidden sm:inline">Create Pair</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              )}
            </div>
          </div>
        </CardToolbar>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
            <p>Loading pairs...</p>
          </div>
        ) : sortedPairs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <KeenIcon icon="disconnect" className="text-4xl mb-2 opacity-20" />
            <p>No pairings found</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto overflow-y-hidden">
            <Table className="table-fixed md:table-auto w-full min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45%] md:w-auto cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('mentor')}>
                    <div className="flex items-center">
                      Mentor
                      <SortIcon field="mentor" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="w-[45%] md:w-auto cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('mentee')}>
                    <div className="flex items-center">
                      Mentee
                      <SortIcon field="mentee" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('progress')}>
                    <div className="flex items-center">
                      Progress
                      <SortIcon field="progress" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center">
                      Status
                      <SortIcon field="status" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center">
                      Created
                      <SortIcon field="created_at" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell text-right w-[10%] md:w-auto">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPairs.map((pair) => {
                  const progress = calculatePairProgress(pair.id, allStatuses);
                  return (
                    <TableRow 
                      key={pair.id} 
                      id={`pair-${pair.id}`}
                      className="cursor-pointer hover:bg-muted/40 transition-colors scroll-mt-20"
                      onClick={() => navigate(`${basePath}/checklist?pair=${pair.id}`)}
                    >
                      <TableCell className="overflow-hidden">
                        <div className="flex items-center gap-2 md:gap-3">
                          <Avatar className="size-7 md:size-8 shrink-0">
                            <AvatarImage src={getAvatarPublicUrl(pair.mentor?.avatar_url, pair.mentor?.id)} alt={pair.mentor?.full_name || ''} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                              {getInitials(pair.mentor?.full_name || pair.mentor?.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-gray-900 text-xs md:text-sm truncate block">{pair.mentor?.full_name || 'No name'}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-medium truncate block">{pair.mentor?.job_title || 'N/A'}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="overflow-hidden">
                        <div className="flex items-center gap-2 md:gap-3">
                          <Avatar className="size-7 md:size-8 shrink-0">
                            <AvatarImage src={getAvatarPublicUrl(pair.mentee?.avatar_url, pair.mentee?.id)} alt={pair.mentee?.full_name || ''} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                              {getInitials(pair.mentee?.full_name || pair.mentee?.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-gray-900 text-xs md:text-sm truncate block">{pair.mentee?.full_name || 'No name'}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-medium truncate block">{pair.mentee?.job_title || 'N/A'}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-1 min-w-[80px] lg:min-w-[120px]">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase text-gray-400">
                            <span>{progress.formatted}</span>
                            <span>{progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%</span>
                          </div>
                          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-500" 
                              style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className={cn('capitalize font-medium text-[10px]', PAIR_STATUS_COLORS[pair.status as keyof typeof PAIR_STATUS_COLORS])}>
                          {pair.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="hidden xl:table-cell text-xs text-gray-600">
                        {new Date(pair.created_at).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="hidden md:table-cell text-right">
                        <div className="flex items-center justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            mode="icon" 
                            className="size-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent row click when clicking button
                              navigate(`${basePath}/checklist?pair=${pair.id}`);
                            }}
                          >
                            <KeenIcon icon="setting-2" className="text-lg" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

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
