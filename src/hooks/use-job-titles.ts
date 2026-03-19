import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchJobTitles, 
  createJobTitle, 
  updateJobTitle, 
  deleteJobTitle,
  toggleJobTitleStatus,
  type JobTitle 
} from '@/lib/api/job-titles';
import { useOrganisation } from '@/providers/organisation-provider';
import { toast } from 'sonner';

export function useJobTitles() {
  const { activeOrganisation } = useOrganisation();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['job-titles', activeOrganisation?.id],
    queryFn: () => fetchJobTitles(activeOrganisation!.id),
    enabled: !!activeOrganisation?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (title: string) => createJobTitle(activeOrganisation!.id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-titles', activeOrganisation?.id] });
      toast.success('Job title added');
    },
    onError: (error: any) => {
      toast.error(`Failed to add job title: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => updateJobTitle(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-titles', activeOrganisation?.id] });
      toast.success('Job title updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update job title: ${error.message}`);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleJobTitleStatus(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-titles', activeOrganisation?.id] });
      toast.success(`Job title ${variables.isActive ? 'activated' : 'deactivated'}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to change job title status: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJobTitle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-titles', activeOrganisation?.id] });
      toast.success('Job title removed');
    },
    onError: (error: any) => {
      toast.error(`Failed to remove job title: ${error.message}`);
    },
  });

  return {
    jobTitles: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createJobTitle: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateJobTitle: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    toggleJobTitleStatus: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
    deleteJobTitle: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
