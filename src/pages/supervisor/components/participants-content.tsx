import { useState, useMemo } from 'react';
import { useParticipants } from '@/hooks/use-participants';
import { CreateParticipantInput, UpdateParticipantInput, Participant } from '@/lib/api/participants';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  UserPlus, 
  MoreVertical, 
  Edit, 
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
    isUpdating
  } = useParticipants();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'supervisor' | 'program-member'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  
  // Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState({ email: '', password: '', name: '', role: '' as any });

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

  const handleCreate = async (data: any) => {
    try {
      await createParticipant(data);
      setNewCredentials({
        email: data.email,
        password: data.password,
        name: data.full_name || 'New User',
        role: data.role
      });
      setIsDialogOpen(false);
      setShowCredentials(true);
      toast.success('Participant created successfully');
    } catch (err) {
      console.error('Error creating participant:', err);
      toast.error('Failed to create participant');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingParticipant) return;
    try {
      await updateParticipant(editingParticipant.id, data);
      setIsDialogOpen(false);
      setEditingParticipant(null);
      toast.success('Participant updated successfully');
    } catch (err) {
      console.error('Error updating participant:', err);
      toast.error('Failed to update participant');
    }
  };

  const handleArchive = async (id: string) => {
    if (window.confirm('Are you sure you want to archive this participant? They will no longer be able to log in.')) {
      try {
        await archiveParticipant(id);
        toast.success('Participant archived');
      } catch (err) {
        toast.error('Failed to archive participant');
      }
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreParticipant(id);
      toast.success('Participant restored');
    } catch (err) {
      toast.error('Failed to restore participant');
    }
  };

  const openEditDialog = (participant: Participant) => {
    setEditingParticipant(participant);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7.5">
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

      <Card>
        <CardHeader className="flex-wrap gap-4 px-6 py-4 border-b border-gray-100">
          <CardTitle className="text-lg font-bold">Manage Participants</CardTitle>
          <CardToolbar className="gap-2.5">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder="Search..." 
                className="pl-9 h-10 w-[200px] lg:w-[250px] rounded-xl font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={roleFilter} onValueChange={(val: any) => setRoleFilter(val)}>
              <SelectTrigger className="w-[140px] h-10 rounded-xl font-bold text-xs uppercase tracking-tight">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="supervisor">Supervisors</SelectItem>
                <SelectItem value="program-member">Program Members</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="w-[120px] h-10 rounded-xl font-bold text-xs uppercase tracking-tight">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => { setEditingParticipant(null); setIsDialogOpen(true); }} className="h-10 rounded-xl font-bold gap-2">
              <UserPlus size={18} />
              Add Member
            </Button>
          </CardToolbar>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="w-[300px] px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Participant</TableHead>
                  <TableHead className="px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Contact & Info</TableHead>
                  <TableHead className="px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Role</TableHead>
                  <TableHead className="px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Status</TableHead>
                  <TableHead className="w-[100px] px-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-medium italic">
                      No participants found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParticipants.map((p) => (
                    <TableRow key={p.id} className="hover:bg-primary/[0.01] transition-colors group">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <ProfileAvatar 
                            userId={p.id} 
                            currentAvatar={p.avatar_url} 
                            userName={p.full_name || p.email} 
                            size="md" 
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-gray-900 truncate leading-tight mb-0.5">
                              {p.full_name || 'No Name Set'}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium truncate flex items-center gap-1">
                              <Briefcase size={10} className="text-gray-400" />
                              {p.job_title || 'No Job Title'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
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
                      <TableCell className="px-6 py-4">
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
                      <TableCell className="px-6 py-4 text-center">
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
                      <TableCell className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" mode="icon" className="size-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical size={18} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[180px] rounded-xl shadow-xl border-gray-100">
                            <DropdownMenuItem onClick={() => openEditDialog(p)} className="gap-2.5 py-2.5 font-bold text-xs uppercase tracking-tight">
                              <Edit size={14} className="text-gray-400" />
                              Edit Member
                            </DropdownMenuItem>
                            {p.status === 'active' ? (
                              <DropdownMenuItem onClick={() => handleArchive(p.id)} className="gap-2.5 py-2.5 font-bold text-xs uppercase tracking-tight text-danger focus:text-danger">
                                <UserX size={14} className="text-danger/60" />
                                Archive Member
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleRestore(p.id)} className="gap-2.5 py-2.5 font-bold text-xs uppercase tracking-tight text-success focus:text-success">
                                <UserCheck size={14} className="text-success/60" />
                                Restore Member
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ParticipantDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={editingParticipant ? handleUpdate : handleCreate}
        participant={editingParticipant || undefined}
        isLoading={isCreating || isUpdating}
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
