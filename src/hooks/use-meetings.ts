import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganisation } from '@/providers/organisation-provider';
import {
  fetchAllMeetings,
  fetchPairMeetings,
  fetchUserUpcomingMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  fetchMeetingStats,
  type CreateMeetingInput,
  type UpdateMeetingInput,
} from '@/lib/api/meetings';

export function useAllMeetings() {
  const queryClient = useQueryClient();
  const { activeProgram } = useOrganisation();
  const programId = activeProgram?.id;

  const { data: meetings = [], isLoading, error } = useQuery({
    queryKey: ['meetings', 'all', programId],
    queryFn: () => fetchAllMeetings(programId),
    enabled: !!programId && typeof programId === 'string' && programId !== '[object Object]',
  });

  const { data: stats } = useQuery({
    queryKey: ['meetings', 'stats', programId],
    queryFn: () => fetchMeetingStats(programId),
    enabled: !!programId && typeof programId === 'string' && programId !== '[object Object]',
  });

  const createMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input: UpdateMeetingInput }) =>
      updateMeeting(meetingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });

  return {
    meetings,
    stats,
    isLoading,
    error,
    createMeeting: (input: CreateMeetingInput) => createMutation.mutateAsync(input),
    updateMeeting: (meetingId: string, input: UpdateMeetingInput) =>
      updateMutation.mutateAsync({ meetingId, input }),
    deleteMeeting: (meetingId: string) => deleteMutation.mutateAsync(meetingId),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function usePairMeetings(pairId: string) {
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading, error } = useQuery({
    queryKey: ['meetings', 'pair', pairId],
    queryFn: () => fetchPairMeetings(pairId),
    enabled: !!pairId,
  });

  const createMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'pair', pairId] });
      queryClient.invalidateQueries({ queryKey: ['meetings', 'all'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input: UpdateMeetingInput }) =>
      updateMeeting(meetingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'pair', pairId] });
      queryClient.invalidateQueries({ queryKey: ['meetings', 'all'] });
    },
  });

  return {
    meetings,
    isLoading,
    error,
    createMeeting: (input: CreateMeetingInput) => createMutation.mutateAsync(input),
    updateMeeting: (meetingId: string, input: UpdateMeetingInput) =>
      updateMutation.mutateAsync({ meetingId, input }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

export function useUserUpcomingMeetings(userId: string) {
  return useQuery({
    queryKey: ['meetings', 'user', userId, 'upcoming'],
    queryFn: () => fetchUserUpcomingMeetings(userId),
    enabled: !!userId,
  });
}
