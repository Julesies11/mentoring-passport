import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/search-input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';
import { useAllPairTaskStatuses } from '@/hooks/use-tasks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200',
};

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
}

export function PairsTable({ pairs, isLoading, onShowMatchmaker }: PairsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: allStatuses = [] } = useAllPairTaskStatuses();

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getProgress = (pairId: string) => {
    const pairTasks = allStatuses.filter(s => s.pair_id === pairId);
    const total = pairTasks.length;
    const completed = pairTasks.filter(s => s.status === 'completed').length;
    return { completed, total, formatted: `${completed}/${total}` };
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
          const aProg = getProgress(a.id);
          const bProg = getProgress(b.id);
          // Sort by completion percentage if possible, or just raw completed count
          aVal = aProg.total > 0 ? aProg.completed / aProg.total : 0;
          bVal = bProg.total > 0 ? bProg.completed / bProg.total : 0;
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

  const { paginatedPairs, totalPages } = useMemo(() => {
    const pages = Math.ceil(sortedPairs.length / itemsPerPage);
    const paginated = sortedPairs.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    return { paginatedPairs: paginated, totalPages: pages };
  }, [sortedPairs, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [searchQuery, filterStatus, itemsPerPage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentoring Pairings</CardTitle>
        <CardToolbar>
          <div className="flex items-center gap-4">
            <SearchInput
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              containerClassName="w-[200px] lg:w-[300px]"
              className="h-9"
            />
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger size="sm" className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Button size="sm" onClick={onShowMatchmaker}>
              <KeenIcon icon="plus-squared" />
              Create Pair
            </Button>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('mentor')}>
                    <div className="flex items-center">
                      Mentor
                      <SortIcon field="mentor" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('mentee')}>
                    <div className="flex items-center">
                      Mentee
                      <SortIcon field="mentee" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('progress')}>
                    <div className="flex items-center">
                      Progress
                      <SortIcon field="progress" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center">
                      Status
                      <SortIcon field="status" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('created_at')}>
                    <div className="flex items-center">
                      Created
                      <SortIcon field="created_at" currentField={sortField} currentOrder={sortOrder} />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPairs.map((pair) => {
                  const progress = getProgress(pair.id);
                  return (
                    <TableRow key={pair.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarImage src={getAvatarPublicUrl(pair.mentor?.avatar_url, pair.mentor?.id)} alt={pair.mentor?.full_name || ''} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                              {getInitials(pair.mentor?.full_name || pair.mentor?.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{pair.mentor?.full_name || 'No name'}</span>
                            {pair.mentor?.job_title && (
                              <span className="text-[10px] text-muted-foreground uppercase font-medium">{pair.mentor.job_title}</span>
                              )}
                              <span className="text-xs text-muted-foreground hidden sm:block">{pair.mentor?.email}</span>
                              </div>
                              </div>
                              </TableCell>
                              <TableCell>
                              <div className="flex items-center gap-3">
                              <Avatar className="size-8">
                              <AvatarImage src={getAvatarPublicUrl(pair.mentee?.avatar_url, pair.mentee?.id)} alt={pair.mentee?.full_name || ''} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                              {getInitials(pair.mentee?.full_name || pair.mentee?.email)}
                              </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                              <span className="font-semibold text-gray-900">{pair.mentee?.full_name || 'No name'}</span>
                              {pair.mentee?.job_title && (
                              <span className="text-[10px] text-muted-foreground uppercase font-medium">{pair.mentee.job_title}</span>
                              )}
                              <span className="text-xs text-muted-foreground hidden sm:block">{pair.mentee?.email}</span>
                              </div>
                              </div>
                              </TableCell>
                              <TableCell>
                              <div className="flex flex-col gap-1 min-w-[80px]">                          <div className="flex items-center justify-between text-[10px] font-black uppercase text-gray-400">
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
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize font-medium', statusColors[pair.status as keyof typeof statusColors])}>
                          {pair.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(pair.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" mode="icon" asChild title="Manage Pair">
                            <Link to={`/supervisor/checklist?pair=${pair.id}`}>
                              <KeenIcon icon="setting-2" />
                            </Link>
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

      {sortedPairs.length > 0 && (
        <div className="border-t border-gray-100 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground order-2 sm:order-1">
            <span>Show</span>
            <select 
              className="h-8 w-[70px] bg-gray-50 border border-gray-200 rounded-md px-1 outline-none focus:ring-2 focus:ring-primary/20"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>per page</span>
            <span className="mx-2 text-gray-200">|</span>
            <span>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedPairs.length)} of {sortedPairs.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 order-1 sm:order-2">
            <Button
              variant="outline" size="sm" mode="icon" className="size-8 rounded-md"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <KeenIcon icon="black-left" />
            </Button>
            <div className="flex items-center px-2">
              <span className="text-sm font-bold text-gray-900">Page {currentPage} of {totalPages || 1}</span>
            </div>
            <Button
              variant="outline" size="sm" mode="icon" className="size-8 rounded-md"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <KeenIcon icon="black-right" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
