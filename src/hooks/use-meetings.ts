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
      const pair = meetingData.mp_pairs;
      if (pair && user?.id) {
        // Handle both old and new data structures
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;
        const orgId = pair.organisation_id || pair.program?.organisation_id;

        if (mentorId && menteeId) {
          await NotificationService.notifyMeetingChange(
            meetingData.id,
            meetingData.title,
            meetingData.date_time,
            mentorId,
            menteeId,
            user.id,
            true,
            orgId
          );
        }
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
      const pair = meetingData.mp_pairs;
      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;
        const orgId = pair.organisation_id || pair.program?.organisation_id;

        if (mentorId && menteeId) {
          await NotificationService.notifyMeetingChange(
            meetingData.id,
            meetingData.title,
            meetingData.date_time,
            mentorId,
            menteeId,
            user.id,
            false,
            orgId
          );
        }
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMeeting,
    onSuccess: async (deletedMeeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });

      // Notify partner
      const meetingData = deletedMeeting as any;
      const pair = meetingData.mp_pairs;
      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;
        const orgId = pair.organisation_id || pair.program?.organisation_id;

        if (mentorId && menteeId) {
          await NotificationService.notifyMeetingCancelled(
            meetingData.title,
            meetingData.date_time,
            mentorId,
            menteeId,
            user.id,
            orgId
          );
        }
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
      const pair = meetingData.mp_pairs;
      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;
        const orgId = pair.organisation_id || pair.program?.organisation_id;

        if (mentorId && menteeId) {
          await NotificationService.notifyMeetingChange(
            meetingData.id,
            meetingData.title,
            meetingData.date_time,
            mentorId,
            menteeId,
            user.id,
            true,
            orgId
          );
        }
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
      const pair = meetingData.mp_pairs;
      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;
        const orgId = pair.organisation_id || pair.program?.organisation_id;

        if (mentorId && menteeId) {
          await NotificationService.notifyMeetingChange(
            meetingData.id,
            meetingData.title,
            meetingData.date_time,
            mentorId,
            menteeId,
            user.id,
            false,
            orgId
          );
        }
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
