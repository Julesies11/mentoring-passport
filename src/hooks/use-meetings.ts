import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganisation } from '@/providers/organisation-provider';
import { useAuth } from '@/auth/context/auth-context';
import { NotificationService } from '@/lib/api/notifications-service';
import { isFuture } from 'date-fns';
import {
  fetchAllMeetings,
  fetchPairMeetings,
  fetchUserUpcomingMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  type CreateMeetingInput,
  type UpdateMeetingInput,
} from '@/lib/api/meetings';

const EMPTY_ARRAY: any[] = [];

export function useAllMeetings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeProgram } = useOrganisation();
  const programId = activeProgram?.id;

  const query = useQuery({
    queryKey: ['meetings', 'all', programId],
    queryFn: () => fetchAllMeetings(programId),
    enabled: true,
  });

  const meetings = query.data || EMPTY_ARRAY;

  const stats = useMemo(() => {
    return {
      total: meetings.length,
      upcoming: meetings.filter((m: any) => isFuture(new Date(m.date_time))).length,
      past: meetings.filter((m: any) => !isFuture(new Date(m.date_time))).length,
    };
  }, [meetings]);

  const createMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: async (newMeeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      
      const meetingData = newMeeting as any;
      const pair = meetingData.mp_pairs;
      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;

        if (mentorId && menteeId) {
          await NotificationService.notifyMeetingChange(
            meetingData.id,
            meetingData.title,
            meetingData.date_time,
            mentorId,
            menteeId,
            user.id,
            true
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
      
      const meetingData = updatedMeeting as any;
      const pair = meetingData.mp_pairs;
      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;

        if (mentorId && menteeId) {
          await NotificationService.notifyMeetingChange(
            meetingData.id,
            meetingData.title,
            meetingData.date_time,
            mentorId,
            menteeId,
            user.id,
            false
          );
        }
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMeeting,
    onSuccess: async (deletedMeeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });

      const meetingData = deletedMeeting as any;
      const pair = meetingData.mp_pairs;
      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;

        if (mentorId && menteeId) {
          await NotificationService.notifyMeetingCancelled(
            meetingData.title,
            meetingData.date_time,
            mentorId,
            menteeId,
            user.id
          );
        }
      }
    },
  });

  return {
    meetings,
    stats,
    isLoading: query.isLoading,
    error: query.error,
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

  const query = useQuery({
    queryKey: ['meetings', 'pair', pairId],
    queryFn: () => fetchPairMeetings(pairId),
    enabled: !!pairId,
  });

  const createMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: async (newMeeting) => {
      queryClient.invalidateQueries({ queryKey: ['meetings', 'pair', pairId] });
      queryClient.invalidateQueries({ queryKey: ['meetings', 'all'] });
      
      const meetingData = newMeeting as any;
      const pair = meetingData.mp_pairs;
      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;

        if (mentorId && menteeId) {
          await NotificationService.notifyMeetingChange(
            meetingData.id,
            meetingData.title,
            meetingData.date_time,
            mentorId,
            menteeId,
            user.id,
            true
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
      
      const meetingData = updatedMeeting as any;
      const pair = meetingData.mp_pairs;
      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;

        if (mentorId && menteeId) {
          await NotificationService.notifyMeetingChange(
            meetingData.id,
            meetingData.title,
            meetingData.date_time,
            mentorId,
            menteeId,
            user.id,
            false
          );
        }
      }
    },
  });

  return {
    meetings: query.data || EMPTY_ARRAY,
    isLoading: query.isLoading,
    error: query.error,
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
