import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganisation } from '@/providers/organisation-provider';
import { useAuth } from '@/auth/context/auth-context';
import { NotificationService } from '@/lib/api/notifications-service';
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
  const { user } = useAuth();
  const { activeProgram, activeOrganisation } = useOrganisation();
  const programId = activeProgram?.id;
  const orgId = activeOrganisation?.id;

  const { data: meetings = [], isLoading, error } = useQuery({
    queryKey: ['meetings', 'all', programId, orgId],
    queryFn: () => fetchAllMeetings(programId, orgId),
    enabled: !!(programId || orgId || user?.role === 'administrator'),
  });

  const { data: stats } = useQuery({
    queryKey: ['meetings', 'stats', programId, orgId],
    queryFn: () => fetchMeetingStats(programId, orgId),
    enabled: !!(programId || orgId || user?.role === 'administrator'),
  });

  const createMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: async (newMeeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      
      // Notify partner
      const meetingData = newMeeting as any;
      if (meetingData.mp_pairs && user?.id) {
        await NotificationService.notifyMeetingChange(
          meetingData.id,
          meetingData.title,
          meetingData.date_time,
          meetingData.mp_pairs.mentor_id,
          meetingData.mp_pairs.mentee_id,
          user.id,
          true
        );
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input: UpdateMeetingInput }) =>
      updateMeeting(meetingId, input),
    onSuccess: async (updatedMeeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      
      // Notify partner
      const meetingData = updatedMeeting as any;
      if (meetingData.mp_pairs && user?.id) {
        await NotificationService.notifyMeetingChange(
          meetingData.id,
          meetingData.title,
          meetingData.date_time,
          meetingData.mp_pairs.mentor_id,
          meetingData.mp_pairs.mentee_id,
          user.id,
          false
        );
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMeeting,
    onSuccess: async (deletedMeeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });

      // Notify partner
      const meetingData = deletedMeeting as any;
      if (meetingData.mp_pairs && user?.id) {
        await NotificationService.notifyMeetingCancelled(
          meetingData.title,
          meetingData.date_time,
          meetingData.mp_pairs.mentor_id,
          meetingData.mp_pairs.mentee_id,
          user.id
        );
      }
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
  const { user } = useAuth();

  const { data: meetings = [], isLoading, error } = useQuery({
    queryKey: ['meetings', 'pair', pairId],
    queryFn: () => fetchPairMeetings(pairId),
    enabled: !!pairId,
  });

  const createMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: async (newMeeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'pair', pairId] });
      queryClient.invalidateQueries({ queryKey: ['meetings', 'all'] });
      
      // Notify partner
      const meetingData = newMeeting as any;
      if (meetingData.mp_pairs && user?.id) {
        await NotificationService.notifyMeetingChange(
          meetingData.id,
          meetingData.title,
          meetingData.date_time,
          meetingData.mp_pairs.mentor_id,
          meetingData.mp_pairs.mentee_id,
          user.id,
          true
        );
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: string; input: UpdateMeetingInput }) =>
      updateMeeting(meetingId, input),
    onSuccess: async (updatedMeeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'pair', pairId] });
      queryClient.invalidateQueries({ queryKey: ['meetings', 'all'] });
      
      // Notify partner
      const meetingData = updatedMeeting as any;
      if (meetingData.mp_pairs && user?.id) {
        await NotificationService.notifyMeetingChange(
          meetingData.id,
          meetingData.title,
          meetingData.date_time,
          meetingData.mp_pairs.mentor_id,
          meetingData.mp_pairs.mentee_id,
          user.id,
          false
        );
      }
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
