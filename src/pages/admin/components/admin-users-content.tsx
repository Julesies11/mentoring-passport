import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchParticipants, updateParticipant, archiveParticipant, restoreParticipant, Participant } from '@/lib/api/participants';
import { fetchOrganisations } from '@/lib/api/organisations';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { KeenIcon } from '@/components/keenicons';
import { Search, Mail, Building2 } from 'lucide-react';
import { usePagination } from '@/hooks/use-pagination';
import { DataTablePagination } from '@/components/common/data-table-pagination';
import { ParticipantDialog } from '@/components/participants/participant-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function AdminUsersContent() {
  const queryClient = useQueryClient();
  const { data: participants = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-global-users'],
    queryFn: () => fetchParticipants(), 
  });

  const { data: organisations = [] } = useQuery({
    queryKey: ['organisations'],
    queryFn: fetchOrganisations,
  });

  const orgMap = useMemo(() => {
    const map = new Map<string, string>();
    organisations.forEach(org => map.set(org.id, org.name));
    return map;
  }, [organisations]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Participant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = useMemo(() => {
    return participants.filter(p => {
      const matchesSearch = 
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesOrg = orgFilter === 'all' || p.organisation_id === orgFilter;
      const matchesRole = roleFilter === 'all' || p.role === roleFilter;
      
      return matchesSearch && matchesStatus && matchesOrg && matchesRole;
    });
  }, [participants, searchTerm, statusFilter, orgFilter, roleFilter]);

  const {
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedItems: paginatedUsers,
    goToNextPage,
    goToPrevPage,
    totalItems,
    startIndex,
    endIndex
  } = usePagination({
    items: filteredUsers,
    initialItemsPerPage: 10
  });

  const handleUpdate = async (data: any) => {
    if (!editingUser) return;
    setIsSubmitting(true);
    try {
      const { avatar_file, delete_avatar, ...input } = data;
      await updateParticipant(editingUser.id, input);
      queryClient.invalidateQueries({ queryKey: ['admin-global-users'] });
      toast.success('User updated successfully');
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (window.confirm('Archive this user? They will no longer be able to log in.')) {
      try {
        await archiveParticipant(id);
        queryClient.invalidateQueries({ queryKey: ['admin-global-users'] });
        toast.success('User archived');
      } catch (err: any) {
        toast.error(`Error: ${err.message}`);
      }
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreParticipant(id);
      queryClient.invalidateQueries({ queryKey: ['admin-global-users'] });
      toast.success('User restored');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const openEdit = (user: Participant) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  };

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <Card className="border-0 sm:border">
        <CardHeader className="flex-wrap gap-3 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-100 min-h-0">
          <CardTitle className="text-sm sm:text-lg font-bold">Global User Directory</CardTitle>
          <CardToolbar className="gap-2 sm:gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder="Search users..." 
                className="pl-9 h-9 sm:h-10 w-full sm:w-[180px] lg:w-[220px] rounded-xl font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger className="h-9 sm:h-10 w-[140px] lg:w-[180px] rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-tight">
                  <SelectValue placeholder="Organisation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orgs</SelectItem>
                  {organisations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-9 sm:h-10 w-[110px] rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-tight">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="administrator">Admin</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="program-member">Member</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="h-9 sm:h-10 w-[110px] rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-tight">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardToolbar>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingUsers ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="table-auto w-full min-w-full">
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">User</TableHead>
                    <TableHead className="px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Organisation</TableHead>
                    <TableHead className="px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Role</TableHead>
                    <TableHead className="px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Status</TableHead>
                    <TableHead className="px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-medium italic">
                        No users found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((u) => (
                      <TableRow key={u.id} className="hover:bg-primary/[0.01] transition-colors group cursor-pointer" onClick={() => openEdit(u)}>
                        <TableCell className="px-6 py-4 overflow-hidden">
                          <div className="flex items-center gap-3 min-w-0">
                            <ProfileAvatar 
                              userId={u.id} 
                              currentAvatar={u.avatar_url} 
                              userName={u.full_name || u.email} 
                              size="md" 
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-gray-900 leading-tight mb-0.5 text-sm truncate">
                                {u.full_name || 'No Name Set'}
                              </span>
                              <span className="text-[11px] text-gray-500 font-medium truncate flex items-center gap-1">
                                <Mail size={10} className="text-gray-400 shrink-0" />
                                <span className="truncate">{u.email}</span>
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-gray-700 font-bold">
                            <Building2 size={12} className="text-primary opacity-50 shrink-0" />
                            <span className="truncate max-w-[150px]">
                              {u.organisation_id ? orgMap.get(u.organisation_id) || 'Unknown' : <span className="text-primary font-black uppercase text-[9px]">System Global</span>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "rounded-full font-black uppercase text-[9px] px-2.5 h-5 border-none",
                              u.role === 'administrator' ? "bg-zinc-900 text-white" : 
                              u.role === 'supervisor' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            )}
                          >
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "rounded-full font-black uppercase text-[9px] px-2.5 h-5 border-none",
                              u.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            )}
                          >
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={(e) => { e.stopPropagation(); openEdit(u); }}
                              className="size-8 rounded-lg hover:bg-primary-light hover:text-primary transition-all text-gray-400"
                            >
                              <KeenIcon icon="pencil" className="text-lg" />
                            </Button>
                            {u.status === 'active' ? (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => { e.stopPropagation(); handleArchive(u.id); }}
                                className="size-8 rounded-lg hover:bg-danger-light hover:text-danger transition-all text-gray-400"
                              >
                                <KeenIcon icon="trash" className="text-lg" />
                              </Button>
                            ) : (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => { e.stopPropagation(); handleRestore(u.id); }}
                                className="size-8 rounded-lg hover:bg-success-light hover:text-success transition-all text-gray-400"
                              >
                                <KeenIcon icon="check-circle" className="text-lg" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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
        participant={editingUser}
        onSubmit={handleUpdate}
        isLoading={isSubmitting}
      />
    </div>
  );
}
