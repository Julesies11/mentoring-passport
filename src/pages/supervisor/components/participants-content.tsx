import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useParticipants } from '@/hooks/use-participants';
import { useAllPairs } from '@/hooks/use-pairs';
import { CreateParticipantDialog } from '@/components/participants/participant-dialog-create';
import { ParticipantDialog } from '@/components/participants/participant-dialog';
import { CredentialsDialog } from '@/components/participants/credentials-dialog';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/search-input';
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
import { supabase } from '@/lib/supabase';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import type { Participant, CreateParticipantInput, UpdateParticipantInput } from '@/lib/api/participants';

const roleColors = {
  supervisor: 'bg-purple-100 text-purple-800 border-purple-200',
  'program-member': 'bg-blue-100 text-blue-800 border-blue-200',
  mentor: 'bg-blue-100 text-blue-800 border-blue-200',
  mentee: 'bg-green-100 text-green-800 border-green-200',
};

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function ParticipantsContent() {
  const { user } = useAuth();
  const { 
    participants, 
    stats, 
    isLoading: participantsLoading, 
    createParticipant, 
    updateParticipant, 
    archiveParticipant, 
    restoreParticipant,
    isCreating,
    isUpdating,
  } = useParticipants();
  const { data: allPairs = [], isLoading: pairsLoading } = useAllPairs();
  
  const isLoading = participantsLoading || pairsLoading;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'supervisor' | 'program-member'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('active');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState({ email: '', password: '', name: '', role: '' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Business Logic: Calculate pairing statistics for each participant
  const participantsWithStats = useMemo(() => {
    return participants.map(participant => {
      const activeMentorCount = allPairs.filter(p => p.mentor_id === participant.id && p.status === 'active').length;
      const activeMenteeCount = allPairs.filter(p => p.mentee_id === participant.id && p.status === 'active').length;
      const inactiveMentorCount = allPairs.filter(p => p.mentor_id === participant.id && p.status !== 'active').length;
      const inactiveMenteeCount = allPairs.filter(p => p.mentee_id === participant.id && p.status !== 'active').length;

      return {
        ...participant,
        active_mentor_count: activeMentorCount,
        active_mentee_count: activeMenteeCount,
        inactive_mentor_count: inactiveMentorCount,
        inactive_mentee_count: inactiveMenteeCount
      };
    });
  }, [participants, allPairs]);

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

  const filteredParticipants = participantsWithStats.filter((participant) => {
    // Hide currently logged in supervisor
    if (participant.id === user?.id) return false;

    const matchesSearch =
      participant.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participant.department?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === 'all' || participant.role === filterRole || 
      (filterRole === 'program-member' && (participant.role === 'mentor' || participant.role === 'mentee' || participant.role === 'program-member'));
    const matchesStatus = filterStatus === 'all' || participant.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery, filterRole, filterStatus, itemsPerPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const paginatedParticipants = filteredParticipants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="grid gap-5 lg:gap-7.5">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="text-sm text-muted-foreground mb-1 text-blue-600">Program Members</p>
                <p className="text-2xl font-bold text-blue-600">{(stats.mentors || 0) + (stats.mentees || 0)}</p>
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
              <SearchInput
                placeholder="Search by name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
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
                variant={filterRole === 'program-member' ? 'primary' : 'outline'}
                size="sm"
                className={filterRole === 'program-member' ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' : ''}
                onClick={() => setFilterRole('program-member')}
              >
                Program Members
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
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Pairings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedParticipants.map((participant) => (
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
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                              {participant.job_title || 'No Job Title'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">{participant.department || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('capitalize font-medium', roleColors[participant.role as keyof typeof roleColors])}>
                          {participant.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const totalActive = participant.active_mentor_count + participant.active_mentee_count;
                          return (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                'font-bold min-w-[3rem] justify-center',
                                totalActive > 0 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-red-50 text-red-700 border-red-200'
                              )}
                            >
                              {totalActive}
                            </Badge>
                          );
                        })()}
                      </TableCell>
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
        
        {/* Pagination Footer */}
        {filteredParticipants.length > 0 && (
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
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredParticipants.length)} of {filteredParticipants.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                mode="icon"
                className="size-8 rounded-md"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <KeenIcon icon="black-left" />
              </Button>
              
              <div className="flex items-center px-2">
                <span className="text-sm font-bold text-gray-900">Page {currentPage} of {totalPages || 1}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                mode="icon"
                className="size-8 rounded-md"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <KeenIcon icon="black-right" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CreateParticipantDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={isCreating}
      />

      <ParticipantDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingParticipant(null);
        }}
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
