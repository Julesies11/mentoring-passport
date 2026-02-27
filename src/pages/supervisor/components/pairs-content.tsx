import { useState } from 'react';
import { usePairs } from '@/hooks/use-pairs';
import { useParticipantsByRole } from '@/hooks/use-participants';
import { usePairTasks } from '@/hooks/use-tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { ProfileAvatar } from '@/components/profile/profile-avatar';

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200',
};

// Component to display pair progress with link to checklist
function PairProgress({ pairId }: { pairId: string }) {
  const { stats, isLoading } = usePairTasks(pairId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <KeenIcon icon="loading" className="animate-spin text-xs" />
        <span className="text-xs text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!stats) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <Link 
        to={`/supervisor/checklist?pair=${pairId}`}
        className="text-sm font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1.5"
      >
        <KeenIcon icon="check-square" className="text-base" />
        {stats.completed}/{stats.total}
      </Link>
    </div>
  );
}

export function PairsContent() {
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
    <div className="grid gap-5 lg:gap-7.5">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Total Pairs</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1 text-success">Active</p>
              <p className="text-2xl font-bold text-success">{stats.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1 text-primary">Completed</p>
              <p className="text-2xl font-bold text-primary">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground mb-1">Archived</p>
              <p className="text-2xl font-bold">{stats.archived}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <KeenIcon icon="magnifier" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg" />
              <Input
                placeholder="Search by mentor or mentee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterStatus === 'active' ? 'primary' : 'outline'}
                size="sm"
                className={filterStatus === 'active' ? 'bg-green-600 border-green-600 text-white hover:bg-green-700' : ''}
                onClick={() => setFilterStatus('active')}
              >
                Active
              </Button>
              <Button
                variant={filterStatus === 'completed' ? 'primary' : 'outline'}
                size="sm"
                className={filterStatus === 'completed' ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' : ''}
                onClick={() => setFilterStatus('completed')}
              >
                Completed
              </Button>
              <Button
                variant={filterStatus === 'archived' ? 'primary' : 'outline'}
                size="sm"
                className={filterStatus === 'archived' ? 'bg-gray-600 border-gray-600 text-white hover:bg-gray-700' : ''}
                onClick={() => setFilterStatus('archived')}
              >
                Archived
              </Button>
            </div>
            
            <Button onClick={() => setDialogOpen(true)}>
                <KeenIcon icon="plus-squared" />
                Create Pair
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pairs Table */}
      <Card>
        <CardHeader>
            <CardTitle>Mentoring Pairings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
              <p>Loading pairs...</p>
            </div>
          ) : filteredPairs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="disconnect" className="text-4xl mb-2 opacity-20" />
              <p>No pairs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Mentor</TableHead>
                    <TableHead className="w-[250px]">Mentee</TableHead>
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
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{pair.mentor?.full_name || 'No name'}</span>
                            <span className="text-xs text-muted-foreground">{pair.mentor?.email}</span>
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
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{pair.mentee?.full_name || 'No name'}</span>
                            <span className="text-xs text-muted-foreground">{pair.mentee?.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{pair.mentor?.department || '-'}</TableCell>
                      <TableCell>
                        <PairProgress pairId={pair.id} />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize font-medium', statusColors[pair.status as keyof typeof statusColors])}>
                          {pair.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-muted-foreground">
                        {new Date(pair.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            mode="icon"
                            asChild
                            title="View Checklist"
                          >
                            <Link to={`/supervisor/checklist?pair=${pair.id}`}>
                              <KeenIcon icon="file-search" />
                            </Link>
                          </Button>

                          {pair.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              mode="icon"
                              className="text-success hover:bg-success/5"
                              onClick={() => handleMarkComplete(pair.id)}
                              title="Mark as Complete"
                            >
                              <KeenIcon icon="check-circle" />
                            </Button>
                          )}

                          <Button
                            variant="destructive"
                            appearance="light"
                            size="sm"
                            mode="icon"
                            onClick={() => archivePair(pair.id)}
                            title="Archive Pair"
                          >
                            <KeenIcon icon="archive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Mentoring Pair</DialogTitle>
            <DialogDescription>
              Select a mentor and mentee to create a new pairing
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Mentor</Label>
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
              <Label className="text-xs font-bold uppercase text-muted-foreground">Mentee</Label>
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleCreatePair} 
              className="flex-1"
              disabled={!selectedMentor || !selectedMentee || isCreating}
            >
              {isCreating ? (
                <>
                    <KeenIcon icon="loading" className="animate-spin mr-2" />
                    Creating...
                </>
              ) : 'Create Pair'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
