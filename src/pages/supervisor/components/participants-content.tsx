import { useState } from 'react';
import { useParticipants } from '@/hooks/use-participants';
import { CreateParticipantDialog } from '@/components/participants/participant-dialog-create';
import { ParticipantDialog } from '@/components/participants/participant-dialog';
import { CredentialsDialog } from '@/components/participants/credentials-dialog';
import { Button } from '@/components/ui/button';
import { Input, InputWrapper } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import type { Participant, CreateParticipantInput, UpdateParticipantInput } from '@/lib/api/participants';

const roleColors = {
  supervisor: 'bg-purple-100 text-purple-800 border-purple-200',
  mentor: 'bg-blue-100 text-blue-800 border-blue-200',
  mentee: 'bg-green-100 text-green-800 border-green-200',
};

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function ParticipantsContent() {
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

  const handleUpdate = async (data: UpdateParticipantInput & { avatar_file?: File; delete_avatar?: boolean }) => {
    if (editingParticipant) {
      let avatarUrl = editingParticipant.avatar_url;

      if (data.delete_avatar) {
        avatarUrl = null;
      } else if (data.avatar_file) {
        try {
          const file = data.avatar_file;
          const fileExt = file.name.split('.').pop();
          const fileName = `${editingParticipant.id}-${Date.now()}.${fileExt}`;
          const filePath = `${editingParticipant.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('mp-avatars')
            .upload(filePath, file, { upsert: true });

          if (uploadError) throw uploadError;
          avatarUrl = fileName;
        } catch (error) {
          console.error('Error uploading avatar:', error);
        }
      }

      const { avatar_file, delete_avatar, ...apiData } = data;
      await updateParticipant(editingParticipant.id, { ...apiData, avatar_url: avatarUrl });
      
      // Close dialog and clear selection on success
      setEditDialogOpen(false);
      setEditingParticipant(null);
    }
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
    <div className="grid gap-5 lg:gap-7.5">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-1">Total</p>
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
                <p className="text-sm text-muted-foreground mb-1 text-purple-600">Supervisors</p>
                <p className="text-2xl font-bold text-purple-600">{stats.supervisors}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-1 text-blue-600">Mentors</p>
                <p className="text-2xl font-bold text-blue-600">{stats.mentors}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
                <p className="text-sm text-muted-foreground mb-1 text-success">Mentees</p>
                <p className="text-2xl font-bold text-success">{stats.mentees}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="flex-1">
              <InputWrapper>
                <KeenIcon icon="magnifier" />
                <Input
                  placeholder="Search by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputWrapper>
            </div>

            {/* Role Filter */}
            <div className="flex flex-wrap items-center gap-2">
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
                className={filterRole === 'supervisor' ? 'bg-purple-600 border-purple-600 text-white hover:bg-purple-700' : ''}
                onClick={() => setFilterRole('supervisor')}
              >
                Supervisors
              </Button>
              <Button
                variant={filterRole === 'mentor' ? 'primary' : 'outline'}
                size="sm"
                className={filterRole === 'mentor' ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' : ''}
                onClick={() => setFilterRole('mentor')}
              >
                Mentors
              </Button>
              <Button
                variant={filterRole === 'mentee' ? 'primary' : 'outline'}
                size="sm"
                className={filterRole === 'mentee' ? 'bg-green-600 border-green-600 text-white hover:bg-green-700' : ''}
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
                className={filterStatus === 'active' ? 'bg-green-600 border-green-600 text-white hover:bg-green-700' : ''}
                onClick={() => setFilterStatus('active')}
              >
                Active
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
          </div>
        </CardContent>
      </Card>

      {/* Participants Table */}
      <Card>
        <CardHeader>
            <CardTitle>Program Participants</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
                <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
                <p>Loading participants...</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="user" className="text-4xl mb-2 opacity-20" />
              <p>No participants found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Participant</TableHead>
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
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{participant.full_name || 'No name'}</span>
                            <span className="text-xs text-muted-foreground">{participant.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize font-medium', roleColors[participant.role as keyof typeof roleColors])}>
                          {participant.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{participant.department || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize font-medium', statusColors[participant.status as keyof typeof statusColors])}>
                          {participant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            mode="icon"
                            onClick={() => handleOpenEdit(participant)}
                            title="Edit Participant"
                          >
                            <KeenIcon icon="pencil" />
                          </Button>
                          
                          {participant.status === 'active' ? (
                            <Button
                              variant="destructive"
                              appearance="light"
                              size="sm"
                              mode="icon"
                              onClick={() => archiveParticipant(participant.id)}
                              title="Archive Participant"
                            >
                              <KeenIcon icon="archive" />
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              appearance="light"
                              size="sm"
                              mode="icon"
                              onClick={() => restoreParticipant(participant.id)}
                              title="Restore Participant"
                            >
                              <KeenIcon icon="arrows-loop" />
                            </Button>
                          )}
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
