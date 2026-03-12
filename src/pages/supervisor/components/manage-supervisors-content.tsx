import { useState } from 'react';
import { useOrgSupervisors, useParticipants } from '@/hooks/use-participants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { AssignmentDialog } from './assignment-dialog';
import { cn } from '@/lib/utils';
import { ParticipantDialog } from '@/components/participants/participant-dialog';
import { CredentialsDialog } from '@/components/participants/credentials-dialog';
import { handleAvatarUpload } from '@/lib/api/profiles';
import { toast } from 'sonner';

export function ManageSupervisorsContent() {
  const { supervisors, isLoading } = useOrgSupervisors();
  const { createParticipantAsync, updateParticipantAsync } = useParticipants();
  
  const [selectedSupervisor, setSelectedSupervisor] = useState<any | null>(null);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Credentials state
  const [showCredentials, setShowCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState({ email: '', password: '', name: '', role: 'supervisor' as any });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAssignment = (supervisor: any) => {
    setSelectedSupervisor(supervisor);
    setIsAssignmentDialogOpen(true);
  };

  const handleCreateSupervisor = async (data: any) => {
    setIsSubmitting(true);
    let newParticipantId = null;
    try {
      const { avatar_file, ...input } = data;
      
      // Force role to supervisor
      const supervisorInput = { ...input, role: 'supervisor' };
      
      const newParticipant = await createParticipantAsync(supervisorInput);
      newParticipantId = newParticipant.id;
      
      if (newParticipantId && avatar_file) {
        try {
          const avatarUrl = await handleAvatarUpload(newParticipantId, avatar_file);
          if (avatarUrl) {
            await updateParticipantAsync(newParticipantId, { avatar_url: avatarUrl });
          }
        } catch (avatarErr) {
          console.error('Avatar upload failed:', avatarErr);
        }
      }

      setNewCredentials({
        email: data.email,
        password: data.password,
        name: data.full_name || 'New Supervisor',
        role: 'supervisor'
      });
      setIsCreateDialogOpen(false);
      setShowCredentials(true);
      toast.success('Supervisor created successfully');
    } catch (err: any) {
      console.error('Error creating supervisor:', err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-bold text-gray-900 hidden sm:block">Hospital Supervisors</h2>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex-1 sm:flex-none rounded-xl shadow-lg shadow-primary/20"
          >
            <KeenIcon icon="plus" className="mr-2" />
            Add Supervisor
          </Button>
        </div>
      </div>

      <Card className="border-0 sm:border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center">
              <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="table-auto w-full min-w-full text-sm text-left">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-400 tracking-widest">Supervisor</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-400 tracking-widest">Role</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-400 tracking-widest">Assigned Programs</th>
                    <th className="px-6 py-3 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {supervisors.map((s) => (
                    <tr key={s.id} className="hover:bg-primary/[0.01] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <ProfileAvatar 
                            userId={s.id} 
                            currentAvatar={s.avatar_url} 
                            userName={s.full_name || s.email} 
                            size="md" 
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-sm">{s.full_name || 'Unnamed'}</span>
                            <span className="text-[11px] text-gray-500 font-medium">{s.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "rounded-full font-black uppercase text-[9px] px-2.5 h-5 border-none",
                            s.role === 'org-admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                          )}
                        >
                          {s.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {s.role === 'org-admin' ? (
                          <Badge variant="secondary" className="text-[9px] font-black uppercase text-purple-600 bg-purple-50 px-2 py-1 rounded-lg border-none shadow-sm shadow-purple-100">All Programs</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {s.assigned_program_ids.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="primary" appearance="outline" size="sm" className="px-2 py-0.5 rounded-lg font-bold border-primary/20 bg-primary-light/30">
                                  {s.assigned_program_ids.length} Assigned
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] font-medium text-gray-500 bg-gray-50 border-none shadow-sm shadow-gray-200">No programs</Badge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openAssignment(s)}
                          disabled={s.role === 'org-admin'}
                          className="h-8 rounded-lg font-bold text-[10px] uppercase tracking-tight hover:bg-primary-light hover:text-primary"
                        >
                          <KeenIcon icon="setting-2" className="mr-1" />
                          Programs
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSupervisor && (
        <AssignmentDialog 
          open={isAssignmentDialogOpen}
          onOpenChange={setIsAssignmentDialogOpen}
          supervisor={selectedSupervisor}
        />
      )}

      <ParticipantDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateSupervisor}
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
