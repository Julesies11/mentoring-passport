import { useState } from 'react';
import { usePairs } from '@/hooks/use-pairs';
import { useParticipantsByRole } from '@/hooks/use-participants';
import { usePairTasks } from '@/hooks/use-tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link2, Search, MoreVertical, Archive, CheckCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { ProfileAvatar } from '@/components/profile/profile-avatar';

const statusColors = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-100 text-gray-800',
};

// Component to display pair progress with link to checklist
function PairProgress({ pairId }: { pairId: string }) {
  const { stats, isLoading } = usePairTasks(pairId);

  if (isLoading) {
    return <span className="text-sm text-muted-foreground">Loading...</span>;
  }

  if (!stats) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <Link 
      to={`/supervisor/checklist?pair=${pairId}`}
      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
    >
      {stats.completed}/{stats.total}
    </Link>
  );
}

export function PairsPage() {
  const { pairs, stats, isLoading, createPair, updatePair, archivePair, isCreating } = usePairs();
  const { data: mentors = [] } = useParticipantsByRole('mentor');
  const { data: mentees = [] } = useParticipantsByRole('mentee');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'archived'>('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState('');
  const [selectedMentee, setSelectedMentee] = useState('');

  const filteredPairs = pairs.filter((pair) => {
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

  const handleCreatePair = async () => {
    if (!selectedMentor || !selectedMentee) return;
    
    await createPair({
      mentor_id: selectedMentor,
      mentee_id: selectedMentee,
    });
    
    setSelectedMentor('');
    setSelectedMentee('');
    setDialogOpen(false);
  };

  const handleMarkComplete = (pairId: string) => {
    updatePair(pairId, { status: 'completed' });
  };

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Mentoring Pairs</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage mentor-mentee pairings
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Link2 className="w-4 h-4" />
            Create Pair
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Total Pairs</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Completed</p>
              <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Archived</p>
              <p className="text-2xl font-bold text-gray-600">{stats.archived}</p>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-body">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by mentor or mentee name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'active' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('active')}
                >
                  Active
                </Button>
                <Button
                  variant={filterStatus === 'completed' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('completed')}
                >
                  Completed
                </Button>
                <Button
                  variant={filterStatus === 'archived' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('archived')}
                >
                  Archived
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading pairs...
              </div>
            ) : filteredPairs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pairs found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mentor</TableHead>
                      <TableHead>Mentee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPairs.map((pair) => (
                      <TableRow key={pair.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <ProfileAvatar
                              userId={pair.mentor?.id || ''}
                              currentAvatar={pair.mentor?.avatar_url}
                              userName={pair.mentor?.full_name || pair.mentor?.email}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium">{pair.mentor?.full_name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{pair.mentor?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <ProfileAvatar
                              userId={pair.mentee?.id || ''}
                              currentAvatar={pair.mentee?.avatar_url}
                              userName={pair.mentee?.full_name || pair.mentee?.email}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium">{pair.mentee?.full_name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{pair.mentee?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{pair.mentor?.department || '-'}</TableCell>
                        <TableCell>
                          <PairProgress pairId={pair.id} />
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('capitalize', statusColors[pair.status])}>
                            {pair.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(pair.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" mode="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/supervisor/checklist?pair=${pair.id}`}>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  View Checklist
                                </Link>
                              </DropdownMenuItem>
                              {pair.status === 'active' && (
                                <DropdownMenuItem onClick={() => handleMarkComplete(pair.id)}>
                                  <CheckCircle className="w-4 h-4" />
                                  Mark Complete
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => archivePair(pair.id)}>
                                <Archive className="w-4 h-4" />
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Mentoring Pair</DialogTitle>
            <DialogDescription>
              Select a mentor and mentee to create a new pairing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mentor</Label>
              <Select value={selectedMentor} onValueChange={setSelectedMentor}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mentor" />
                </SelectTrigger>
                <SelectContent>
                  {mentors.map((mentor) => (
                    <SelectItem key={mentor.id} value={mentor.id}>
                      {mentor.full_name || mentor.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mentee</Label>
              <Select value={selectedMentee} onValueChange={setSelectedMentee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mentee" />
                </SelectTrigger>
                <SelectContent>
                  {mentees.map((mentee) => (
                    <SelectItem key={mentee.id} value={mentee.id}>
                      {mentee.full_name || mentee.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePair} 
              disabled={!selectedMentor || !selectedMentee || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Pair'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
