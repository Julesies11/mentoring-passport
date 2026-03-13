import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrganisationsWithAdmins, setupOrganisation, updateOrganisation, fetchOrgCounts, Organisation } from '@/lib/api/organisations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeenIcon } from '@/components/keenicons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { OrganisationDialog } from './organisation-dialog';
import { supabase } from '@/lib/supabase';
import { useOrganisation } from '@/providers/organisation-provider';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/api/profiles';
import { OrganisationLogo } from '@/components/common/organisation-logo';

export function AdminOrganisationsContent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { enterMasquerade } = useOrganisation();
  const { data: organisations = [], isLoading } = useQuery({
    queryKey: ['organisations', 'with-admins'],
    queryFn: fetchOrganisationsWithAdmins,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const setupMutation = useMutation({
    mutationFn: setupOrganisation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      toast.success('Organisation and Org Admin setup successfully');
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateOrganisation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      toast.success('Organisation updated successfully');
      setIsDialogOpen(false);
      setEditingOrg(null);
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // For safety, we should probably archive or check for dependencies
      const { error } = await supabase.from('mp_organisations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      toast.success('Organisation deleted');
    },
    onError: (error: any) => {
      toast.error(`Could not delete organisation: ${error.message}`);
    }
  });

  const handleDialogSubmit = async (data: any) => {
    setIsProcessing(true);
    try {
      if (editingOrg) {
        await updateMutation.mutateAsync({ id: editingOrg.id, data });
      } else {
        await setupMutation.mutateAsync(data);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (org: Organisation) => {
    setEditingOrg(org);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure? This will delete the organisation record. Users linked to this ID may experience issues.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEnterMasquerade = (orgId: string) => {
    enterMasquerade(orgId);
    toast.success('Entering organisation as supervisor');
    navigate('/supervisor/hub');
  };

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <Card className="shadow-none border-0 sm:border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-100 min-h-0">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-gray-900">All Organisations</CardTitle>
          </div>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => { setEditingOrg(null); setIsDialogOpen(true); }}
            className="rounded-xl font-bold text-[10px] sm:text-xs h-8 sm:h-9"
          >
            <KeenIcon icon="plus" className="text-xs" />
            Add Organisation
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="table-fixed md:table-auto w-full min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-400">
                <tr>
                  <th className="text-left py-3 px-6 text-[10px] font-black uppercase tracking-widest">Name</th>
                  <th className="text-left py-3 px-6 text-[10px] font-black uppercase tracking-widest">Admins</th>
                  <th className="text-center py-3 px-6 text-[10px] font-black uppercase tracking-widest">Activity</th>
                  <th className="text-center py-3 px-6 text-[10px] font-black uppercase tracking-widest w-[150px]">Created</th>
                  <th className="text-right py-3 px-6 text-[10px] font-black uppercase tracking-widest w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                       <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                    </td>
                  </tr>
                ) : organisations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400 italic">No organisations found.</td>
                  </tr>
                ) : (
                  organisations.map((org) => (
                    <OrganisationRow 
                      key={org.id} 
                      org={org} 
                      onEdit={() => handleEdit(org)}
                      onDelete={() => handleDelete(org.id)}
                      onEnter={() => handleEnterMasquerade(org.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <OrganisationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        organisation={editingOrg}
        onSubmit={handleDialogSubmit}
        isLoading={isProcessing}
      />
    </div>
  );
}

function OrganisationRow({ org, onEdit, onDelete, onEnter }: { org: any, onEdit: () => void, onDelete: () => void, onEnter: () => void }) {
  const { data: counts, isLoading } = useQuery({
    queryKey: ['org-counts', org.id],
    queryFn: () => fetchOrgCounts(org.id),
  });

  return (
    <tr className="hover:bg-gray-50/50 transition-colors group">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <OrganisationLogo 
            orgId={org.id} 
            logoPath={org.logo_url} 
            name={org.name} 
            size="sm" 
            className="rounded-lg shrink-0 shadow-xs"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-gray-900 group-hover:text-primary transition-colors cursor-pointer truncate" onClick={onEdit}>{org.name}</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight truncate">ID: {org.id.split('-')[0]}...</span>
          </div>
        </div>
      </td>
      <td className="py-4 px-6">
        <div className="flex flex-col gap-3">
          {org.admins && org.admins.length > 0 ? (
            org.admins.map((admin: any) => (
              <div key={admin.id} className="flex items-center gap-3">
                <Avatar className="size-8 rounded-lg border border-gray-100 shadow-sm">
                  <AvatarImage src={getAvatarUrl(admin.id, admin.avatar_url)} />
                  <AvatarFallback className="bg-primary-light text-primary text-[10px] font-black uppercase">
                    {admin.full_name?.substring(0, 2) || admin.email?.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-tight truncate">{admin.full_name}</span>
                  <span className="text-[10px] font-bold text-gray-400 truncate">{admin.email}</span>
                </div>
              </div>
            ))
          ) : (
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">No Admins</span>
          )}
        </div>
      </td>
      <td className="py-4 px-6">
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-xs font-black text-gray-700 leading-none">{isLoading ? '..' : counts?.users}</span>
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">Users</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-black text-gray-700 leading-none">{isLoading ? '..' : counts?.programs}</span>
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">Programs</span>
          </div>
        </div>
      </td>
      <td className="py-4 px-6 text-center">
        <span className="text-xs font-bold text-gray-600">
          {format(new Date(org.created_at), 'MMM d, yyyy')}
        </span>
      </td>
      <td className="py-4 px-6 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEnter}
            className="rounded-lg font-bold text-[10px] h-8 px-3 border-gray-200 hover:bg-primary hover:text-white hover:border-primary transition-all mr-2"
          >
            Enter as Supervisor
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onEdit}
            className="size-8 rounded-lg hover:bg-primary-light hover:text-primary transition-all text-gray-400"
          >
            <KeenIcon icon="pencil" className="text-lg" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onDelete}
            className="size-8 rounded-lg hover:bg-danger-light hover:text-danger transition-all text-gray-400"
          >
            <KeenIcon icon="trash" className="text-lg" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
