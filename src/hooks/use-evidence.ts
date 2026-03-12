import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganisation } from '@/providers/organisation-provider';
import { useAuth } from '@/auth/context/auth-context';
import {
  fetchAllEvidence,
  fetchPairEvidence,
  fetchPendingEvidence,
  createEvidence,
  reviewEvidence,
  uploadEvidenceFile,
  fetchEvidenceStats,
  type CreateEvidenceInput,
  type ReviewEvidenceInput,
} from '@/lib/api/evidence';

export function useAllEvidence() {
  const { user } = useAuth();
  const { activeProgram, activeOrganisation } = useOrganisation();
  const programId = activeProgram?.id;
  const orgId = activeOrganisation?.id;

  return useQuery({
    queryKey: ['evidence', 'all', programId, orgId],
    queryFn: () => fetchAllEvidence(programId, orgId),
    enabled: !!(programId || orgId || user?.role === 'administrator'),
  });
}

export function usePairEvidence(pairId: string) {
  const queryClient = useQueryClient();

  const { data: evidence = [], isLoading, error } = useQuery({
    queryKey: ['evidence', 'pair', pairId],
    queryFn: () => fetchPairEvidence(pairId),
    enabled: !!pairId,
  });

  const createMutation = useMutation({
    mutationFn: createEvidence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence', 'pair', pairId] });
      queryClient.invalidateQueries({ queryKey: ['evidence', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['evidence', 'pending'] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, pairId }: { file: File; pairId: string }) =>
      uploadEvidenceFile(file, pairId),
  });

  return {
    evidence,
    isLoading,
    error,
    createEvidence: (input: CreateEvidenceInput) => createMutation.mutate(input),
    uploadFile: (file: File, pairId: string) => uploadMutation.mutateAsync({ file, pairId }),
    isCreating: createMutation.isPending,
    isUploading: uploadMutation.isPending,
  };
}

export function usePendingEvidence() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeProgram, activeOrganisation } = useOrganisation();
  const programId = activeProgram?.id;
  const orgId = activeOrganisation?.id;

  const { data: evidence = [], isLoading, error } = useQuery({
    queryKey: ['evidence', 'pending', programId, orgId],
    queryFn: () => fetchPendingEvidence(programId, orgId),
    enabled: !!(programId || orgId || user?.role === 'administrator'),
  });

  const { data: stats } = useQuery({
    queryKey: ['evidence', 'stats', programId, orgId],
    queryFn: () => fetchEvidenceStats(programId, orgId),
    enabled: !!(programId || orgId || user?.role === 'administrator'),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ evidenceId, input }: { evidenceId: string; input: ReviewEvidenceInput }) =>
      reviewEvidence(evidenceId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evidence'] });
      queryClient.invalidateQueries({ queryKey: ['pair-tasks'] });
    },
  });

  return {
    evidence,
    stats,
    isLoading,
    error,
    reviewEvidence: (evidenceId: string, input: ReviewEvidenceInput) =>
      reviewMutation.mutateAsync({ evidenceId, input }),
    isReviewing: reviewMutation.isPending,
  };
}
