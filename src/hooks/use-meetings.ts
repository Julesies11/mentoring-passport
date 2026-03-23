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
  const { user, isSupervisor, isAdmin, isSysAdmin, isOrgAdmin } = useAuth();
  const { activeProgram } = useOrganisation();
  
  // High Signal Filtering:
  // 1. Privileged users (Supervisors/Admins) should see meetings for the ACTIVE program context.
  // 2. Regular members should see ALL their meetings across all programs they might be part of.
  const isPrivileged = isSupervisor || isAdmin || isSysAdmin || isOrgAdmin;
  const programId = isPrivileged ? activeProgram?.id : undefined;

  const query = useQuery({
    queryKey: ['meetings', 'all', programId || 'everything', user?.id],
    queryFn: () => fetchAllMeetings(programId),
    enabled: !!user,
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
      
      console.log('Meeting Creation Success:', { meetingId: meetingData.id, hasPair: !!pair });

      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;
        
        console.log('Notification Check:', { mentorId, menteeId, actorId: user.id });

        if (mentorId && menteeId) {
          console.log('Triggering Meeting Notification (Created)...');
          await NotificationService.notifyMeetingCreated({
            meetingId: meetingData.id,
            title: meetingData.title,
            dateTime: meetingData.date_time,
            mentorId,
            menteeId,
            mentorName: pair.mentor?.full_name || 'Mentor',
            menteeName: pair.mentee?.full_name || 'Mentee',
            actorId: user.id
          });
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

      console.log('Meeting Update Success:', { meetingId: meetingData.id, hasPair: !!pair });

      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;

        console.log('Notification Check (Update):', { mentorId, menteeId, actorId: user.id });

        if (mentorId && menteeId) {
          console.log('Triggering Meeting Notification (Updated)...');
          await NotificationService.notifyMeetingUpdated({
            meetingId: meetingData.id,
            title: meetingData.title,
            dateTime: meetingData.date_time,
            mentorId,
            menteeId,
            mentorName: pair.mentor?.full_name || 'Mentor',
            menteeName: pair.mentee?.full_name || 'Mentee',
            actorId: user.id
          });
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

      console.log('Meeting Deletion Success:', { meetingId: meetingData.id, hasPair: !!pair });

      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;

        console.log('Notification Check (Delete):', { mentorId, menteeId, actorId: user.id });

        if (mentorId && menteeId) {
          console.log('Triggering Meeting Notification...');
          await NotificationService.notifyMeetingCancelled({
            title: meetingData.title,
            dateTime: meetingData.date_time,
            mentorId,
            menteeId,
            actorId: user.id
          });
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
      
      console.log('Meeting Creation Success:', { meetingId: meetingData.id, hasPair: !!pair });

      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;
        
        console.log('Notification Check:', { mentorId, menteeId, actorId: user.id });

        if (mentorId && menteeId) {
          console.log('Triggering Meeting Notification (Created)...');
          await NotificationService.notifyMeetingCreated({
            meetingId: meetingData.id,
            title: meetingData.title,
            dateTime: meetingData.date_time,
            mentorId,
            menteeId,
            mentorName: pair.mentor?.full_name || 'Mentor',
            menteeName: pair.mentee?.full_name || 'Mentee',
            actorId: user.id
          });
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

      console.log('Meeting Update Success:', { meetingId: meetingData.id, hasPair: !!pair });

      if (pair && user?.id) {
        const mentorId = pair.mentor_id || pair.mentor?.id;
        const menteeId = pair.mentee_id || pair.mentee?.id;

        console.log('Notification Check (Update):', { mentorId, menteeId, actorId: user.id });

        if (mentorId && menteeId) {
          console.log('Triggering Meeting Notification (Updated)...');
          await NotificationService.notifyMeetingUpdated({
            meetingId: meetingData.id,
            title: meetingData.title,
            dateTime: meetingData.date_time,
            mentorId,
            menteeId,
            mentorName: pair.mentor?.full_name || 'Mentor',
            menteeName: pair.mentee?.full_name || 'Mentee',
            actorId: user.id
          });
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
