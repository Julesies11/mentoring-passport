import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useParticipants } from '@/hooks/use-participants';
import { usePairs } from '@/hooks/use-pairs';
import { useAuth } from '@/auth/context/auth-context';
import { Participant } from '@/lib/api/participants';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Search, 
  UserPlus, 
  UserCheck, 
  UserX,
  Mail,
  Briefcase,
  Building2,
  Phone,
  Users
} from 'lucide-react';
import { ParticipantDialog } from '@/components/participants/participant-dialog';
import { CredentialsDialog } from '@/components/participants/credentials-dialog';
import { toast } from 'sonner';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { cn } from '@/lib/utils';
import { KeenIcon } from '@/components/keenicons';
import { logError } from '@/lib/logger';
import { handleAvatarUpload } from '@/lib/api/profiles';
import { usePagination } from '@/hooks/use-pagination';
import { DataTablePagination } from '@/components/common/data-table-pagination';

export function ParticipantsContent() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('id');
  const { role } = useAuth();
  const isOrgAdmin = role === 'org-admin';

  const { 
    participants, 
    stats, 
    isLoading, 
    createParticipantAsync, 
    updateParticipantAsync, 
    archiveParticipant, 
    restoreParticipant
  } = useParticipants();

  // Effect for highlighting deep-linked participant
  useEffect(() => {
    if (highlightId && !isLoading) {
      // Small delay to ensure table is rendered
      const timer = setTimeout(() => {
        const element = document.getElementById(`participant-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-primary/5', 'ring-2', 'ring-primary/20');
          setTimeout(() => {
            element.classList.remove('bg-primary/5', 'ring-2', 'ring-primary/20');
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightId, isLoading, participants]);

  const { pairs = [] } = usePairs();

  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'supervisor' | 'program-member'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  
  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState({ email: '', password: '', name: '', role: '' as any });

  // If we are on mobile and status is 'all', force it to 'active'
  useEffect(() => {
    if (isMobile && statusFilter === 'all') {
      setStatusFilter('active');
    }
  }, [isMobile, statusFilter]);

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const matchesSearch = 
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.job_title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [participants, searchTerm, roleFilter, statusFilter]);

  // Use centralized pagination hook
  const {
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedItems: paginatedParticipants,
    goToNextPage,
    goToPrevPage,
    goToPage,
    totalItems,
    startIndex,
    endIndex
  } = usePagination({
    items: filteredParticipants,
    initialItemsPerPage: 10
  });

  // Reset to page 1 when search or filters change
  useEffect(() => {
    goToPage(1);
  }, [searchTerm, roleFilter, statusFilter, goToPage]);

  const handleCreate = async (data: any) => {
    setIsSubmitting(true);
    let newParticipantId = null;
    try {
      const { avatar_file, ...input } = data;
      
      // 1. Create the participant first to get the ID
      const newParticipant = await createParticipantAsync(input);
      newParticipantId = newParticipant.id;
      
      // 2. If there's an avatar file, upload it in a separate try-catch
      // to ensure we still show credentials even if upload fails
      if (newParticipantId && avatar_file) {
        try {
          const avatarUrl = await handleAvatarUpload(newParticipantId, avatar_file);
          if (avatarUrl) {
            await updateParticipantAsync(newParticipantId, { avatar_url: avatarUrl });
          }
        } catch (avatarErr) {
          console.error('Avatar upload failed, but user was created:', avatarErr);
          toast.error('User created, but profile picture failed to upload');
        }
      }

      setNewCredentials({
        email: data.email,
        password: data.password,
        name: data.full_name || 'New User',
        role: data.role
      });
      setIsDialogOpen(false);
      setShowCredentials(true);
      toast.success('Participant created successfully');
    } catch (err: any) {
      console.error('Error creating participant:', err);
      
      await logError({
        message: `Member creation failed: ${err.message}`,
        stack: err.stack,
        componentName: 'participants-content',
        metadata: { email: data.email, role: data.role }
      });

      // Re-throw so the dialog can catch it and display it in the error state
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingParticipant) return;
    setIsSubmitting(true);
    try {
      const { avatar_file, delete_avatar, full_name, role, job_title, department, phone, bio, status } = data;
      
      const finalAvatarUrl = await handleAvatarUpload(
        editingParticipant.id,
        avatar_file,
        delete_avatar,
        editingParticipant.avatar_url
      );

      await updateParticipantAsync(editingParticipant.id, {
        full_name,
        role,
        job_title,
        department,
        phone,
        bio,
        status,
        avatar_url: finalAvatarUrl,
      });

      setIsDialogOpen(false);
      setEditingParticipant(null);
      toast.success('Participant updated successfully');
    } catch (err: any) {
      console.error('Error updating participant:', err);

      await logError({
        message: `Member update failed: ${err.message}`,
        stack: err.stack,
        componentName: 'participants-content',
        metadata: { participantId: editingParticipant.id }
      });

      // Re-throw so the dialog can catch it and display it in the error state
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (window.confirm('Are you sure you want to archive this participant? They will no longer be able to log in.')) {
      try {
        await archiveParticipant(id);
        toast.success('Participant archived');
      } catch (_err) {
        toast.error('Failed to archive participant');
      }
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreParticipant(id);
      toast.success('Participant restored');
    } catch (_err) {
      toast.error('Failed to restore participant');
    }
  };

  const openEditDialog = (participant: Participant) => {
    if (!isOrgAdmin) return;
    setEditingParticipant(participant);
    setIsDialogOpen(true);
  };

  return (
    <div className="grid gap-2 sm:gap-5 lg:gap-7.5">
      {/* Stats Summary */}
      {stats && (
        <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7.5">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-primary-light flex items-center justify-center text-primary">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Total Members</p>
                <p className="text-2xl font-black text-gray-900">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Briefcase size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Program Members</p>
                <p className="text-2xl font-black text-gray-900">{stats['program-members'] || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <UserCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Supervisors</p>
                <p className="text-2xl font-black text-gray-900">{stats.supervisors}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="size-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <UserX size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Archived</p>
                <p className="text-2xl font-black text-gray-900">{stats.archived}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-0 sm:border">
        <CardHeader className="flex-wrap gap-3 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-100 min-h-0">
          <CardTitle className="text-sm sm:text-lg font-bold">
            {isOrgAdmin ? 'Manage Participants' : 'View Participants'}
          </CardTitle>
          <CardToolbar className="gap-2 sm:gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder="Search..." 
                className="pl-9 h-9 sm:h-10 w-full sm:w-[200px] lg:w-[250px] rounded-xl font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isMobile && (
                <Select value={roleFilter} onValueChange={(val: any) => setRoleFilter(val)}>
                  <SelectTrigger aria-label="Filter by Role" className="w-full sm:w-[140px] h-9 sm:h-10 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-tight">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="supervisor">Supervisors</SelectItem>
                    <SelectItem value="program-member">Program Members</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger aria-label="Filter by Status" className="w-full sm:w-[120px] h-9 sm:h-10 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-tight">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {!isMobile && <SelectItem value="all">All Status</SelectItem>}
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              {isOrgAdmin && (
                <Button 
                  variant="outline"
                  onClick={() => { setEditingParticipant(null); setIsDialogOpen(true); }} 
                  className="h-9 sm:h-10 rounded-xl font-bold gap-1 sm:gap-2 shrink-0"
                >
                  <UserPlus size={16} className="sm:size-[18px]" />
                  <span className="hidden sm:inline">Add Member</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              )}
            </div>
          </CardToolbar>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto overflow-y-hidden">
              <Table className="table-fixed md:table-auto w-full min-w-full">
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="w-[45%] md:w-auto px-3 sm:px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Participant</TableHead>
                    <TableHead className="hidden md:table-cell px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Contact & Info</TableHead>
                    <TableHead className="w-[30%] md:w-auto px-3 sm:px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Pairings</TableHead>
                    <TableHead className="w-[25%] md:w-auto px-3 sm:px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Role</TableHead>
                    <TableHead className="hidden md:table-cell px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Status</TableHead>
                    <TableHead className="hidden md:table-cell w-[80px] px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedParticipants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isMobile ? 3 : 6} className="text-center py-20 text-muted-foreground font-medium italic">
                        No participants found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedParticipants.map((p) => {
                      const activePairings = pairs.filter(pair => 
                        pair.status === 'active' && (pair.mentor_id === p.id || pair.mentee_id === p.id)
                      ).length;
                      
                      return (
                        <TableRow 
                          key={p.id} 
                          id={`participant-${p.id}`}
                          className={cn(
                            "transition-colors group scroll-mt-20",
                            isOrgAdmin ? "hover:bg-primary/[0.01] cursor-pointer" : ""
                          )}
                          onClick={() => isOrgAdmin && openEditDialog(p)}
                        >
                          <TableCell className="px-3 sm:px-6 py-3 sm:py-4 overflow-hidden">
                            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                              <ProfileAvatar 
                                userId={p.id} 
                                currentAvatar={p.avatar_url} 
                                userName={p.full_name || p.email} 
                                size={isMobile ? "sm" : "md"} 
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-gray-900 leading-tight mb-0.5 text-xs sm:text-sm break-words">
                                  {p.full_name || 'No Name Set'}
                                </span>
                                <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate flex items-center gap-1">
                                  <Briefcase size={10} className="text-gray-400 shrink-0" />
                                  <span className="truncate">{p.job_title || 'No Job Title'}</span>
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell px-6 py-4">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                <Mail size={12} className="text-gray-400" />
                                {p.email}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                <Building2 size={12} className="text-gray-400" />
                                {p.department || 'General'}
                              </div>
                              {p.phone && (
                                <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                  <Phone size={12} className="text-gray-400" />
                                  {p.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "rounded-full font-black text-[10px] px-2.5 h-6 border-none",
                                activePairings > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              )}
                            >
                              {activePairings}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 sm:px-6 py-3 sm:py-4">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "rounded-full font-black uppercase text-[9px] px-2.5 h-5 border-none",
                                p.role === 'supervisor' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                              )}
                            >
                              {p.role === 'supervisor' ? 'Supervisor' : 'Member'}
                            </Badge>
                          </TableCell>
                        <TableCell className="hidden md:table-cell px-6 py-4 text-center">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "rounded-full font-black uppercase text-[9px] px-2.5 h-5 border-none",
                              p.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                            )}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isOrgAdmin && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  mode="icon" 
                                  className="size-9 rounded-full hover:bg-primary/10 hover:text-primary transition-all text-gray-400" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(p);
                                  }}
                                  title="Edit Member"
                                >
                                  <KeenIcon icon="pencil" className="text-lg" />
                                </Button>
                                
                                {p.status === 'active' ? (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    mode="icon" 
                                    className="size-9 rounded-full hover:bg-danger/10 hover:text-danger transition-all text-gray-400" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleArchive(p.id);
                                    }}
                                    title="Archive Member"
                                  >
                                    <KeenIcon icon="trash" className="text-lg" />
                                  </Button>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    mode="icon" 
                                    className="size-9 rounded-full hover:bg-success/10 hover:text-success transition-all text-gray-400" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestore(p.id);
                                    }}
                                    title="Restore Member"
                                  >
                                    <KeenIcon icon="check-circle" className="text-lg" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                        );
                        })
                        )}
                        </TableBody>

              </Table>
            </div>
          )}
        </CardContent>

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
      </Card>

      <ParticipantDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={editingParticipant ? handleUpdate : handleCreate}
        participant={editingParticipant || undefined}
        isLoading={isSubmitting}
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
