import { useState } from 'react';
import { useParticipants } from '@/hooks/use-participants';
import { CreateParticipantDialog } from '@/components/participants/participant-dialog-create';
import { ParticipantDialog } from '@/components/participants/participant-dialog';
import { CredentialsDialog } from '@/components/participants/credentials-dialog';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserPlus, Search, MoreVertical, Archive, RotateCcw, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import type { Participant, CreateParticipantInput, UpdateParticipantInput } from '@/lib/api/participants';

const roleColors = {
  supervisor: 'bg-purple-100 text-purple-800',
  mentor: 'bg-blue-100 text-blue-800',
  mentee: 'bg-green-100 text-green-800',
};

const statusColors = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
};

export function ParticipantsPage() {
  const { 
    participants, 
    stats, 
    isLoading, 
    createParticipant, 
    updateParticipant, 
    archiveParticipant, 
    restoreParticipant,
    isCreating,
    isUpdating,
  } = useParticipants();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'supervisor' | 'mentor' | 'mentee'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('active');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState({ email: '', password: '', name: '', role: '' });

  const handleCreate = async (data: CreateParticipantInput) => {
    await createParticipant(data);
    setNewCredentials({
      email: data.email,
      password: data.password,
      name: data.full_name || data.email,
      role: data.role,
    });
    setShowCredentials(true);
  };

  const handleUpdate = async (data: UpdateParticipantInput) => {
    if (editingParticipant) {
      await updateParticipant(editingParticipant.id, data);
    }
  };

  const handleOpenCreate = () => {
    setCreateDialogOpen(true);
  };

  const handleOpenEdit = (participant: Participant) => {
    setEditingParticipant(participant);
    setEditDialogOpen(true);
  };

  const filteredParticipants = participants.filter((participant) => {
    const matchesSearch =
      participant.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participant.department?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === 'all' || participant.role === filterRole;
    const matchesStatus = filterStatus === 'all' || participant.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Participants</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage mentors, mentees, and supervisors
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <UserPlus className="w-4 h-4" />
            Add Participant
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Supervisors</p>
              <p className="text-2xl font-bold text-purple-600">{stats.supervisors}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Mentors</p>
              <p className="text-2xl font-bold text-blue-600">{stats.mentors}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Mentees</p>
              <p className="text-2xl font-bold text-green-600">{stats.mentees}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="card-body">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Role Filter */}
              <div className="flex gap-2">
                <Button
                  variant={filterRole === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterRole('all')}
                >
                  All Roles
                </Button>
                <Button
                  variant={filterRole === 'supervisor' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterRole('supervisor')}
                >
                  Supervisors
                </Button>
                <Button
                  variant={filterRole === 'mentor' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterRole('mentor')}
                >
                  Mentors
                </Button>
                <Button
                  variant={filterRole === 'mentee' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterRole('mentee')}
                >
                  Mentees
                </Button>
              </div>

              {/* Status Filter */}
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'active' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('active')}
                >
                  Active
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

        {/* Participants Table */}
        <div className="card">
          <div className="card-body p-0">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading participants...
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No participants found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParticipants.map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <ProfileAvatar
                              userId={participant.id}
                              currentAvatar={participant.avatar_url}
                              userName={participant.full_name || participant.email}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium">{participant.full_name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{participant.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('capitalize', roleColors[participant.role])}>
                            {participant.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{participant.department || '-'}</TableCell>
                        <TableCell>
                          <Badge className={cn('capitalize', statusColors[participant.status])}>
                            {participant.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" mode="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenEdit(participant)}>
                                <Edit className="w-4 h-4" />
                                Edit
                              </DropdownMenuItem>
                              {participant.status === 'active' ? (
                                <DropdownMenuItem
                                  onClick={() => archiveParticipant(participant.id)}
                                >
                                  <Archive className="w-4 h-4" />
                                  Archive
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => restoreParticipant(participant.id)}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  Restore
                                </DropdownMenuItem>
                              )}
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

      <CreateParticipantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={isCreating}
      />

      <ParticipantDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        participant={editingParticipant}
        onSubmit={handleUpdate}
        isLoading={isUpdating}
      />

      <CredentialsDialog
        open={showCredentials}
        onOpenChange={setShowCredentials}
        email={newCredentials.email}
        password={newCredentials.password}
        name={newCredentials.name}
        role={newCredentials.role}
      />
    </div>
  );
}
