import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useAllMeetings } from '@/hooks/use-meetings';
import { useAllParticipants } from '@/hooks/use-participants';
import { createMeeting, updateMeeting, deleteMeeting } from '@/lib/api/meetings';
import { useQueryClient } from '@tanstack/react-query';
import { MeetingCalendar } from '@/components/calendar/meeting-calendar';
import { toast } from 'sonner';
import type { Meeting } from '@/lib/api/meetings';

export function SupervisorCalendarPage() {
  const { user } = useAuth();
  const { meetings = [] } = useAllMeetings();
  const { participants = [] } = useAllParticipants();
  const queryClient = useQueryClient();
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');

  const handleMeetingCreate = async (meetingData: Omit<Meeting, 'id'>) => {
    try {
      await createMeeting(meetingData);
      queryClient.invalidateQueries({ queryKey: ['all-meetings'] });
      toast.success('Meeting created successfully');
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to create meeting');
    }
  };

  const handleMeetingUpdate = async (meeting: Meeting) => {
    try {
      await updateMeeting(meeting.id, {
        title: meeting.title,
        notes: meeting.notes,
      });
      queryClient.invalidateQueries({ queryKey: ['all-meetings'] });
      toast.success('Meeting updated successfully');
    } catch (error) {
      console.error('Error updating meeting:', error);
      toast.error('Failed to update meeting');
    }
  };

  const handleMeetingDelete = async (meetingId: string) => {
    try {
      await deleteMeeting(meetingId);
      queryClient.invalidateQueries({ queryKey: ['all-meetings'] });
      toast.success('Meeting deleted successfully');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    }
  };

  const handleParticipantFilter = (participantId: string) => {
    setSelectedParticipant(participantId);
  };

  return (
    <div className="container-fixed py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-600">
            View and manage all meetings across all mentor-mentee pairs
          </p>
        </div>

        <MeetingCalendar
          meetings={meetings}
          participants={participants}
          onMeetingCreate={handleMeetingCreate}
          onMeetingUpdate={handleMeetingUpdate}
          onMeetingDelete={handleMeetingDelete}
          selectedParticipant={selectedParticipant}
          onParticipantFilter={handleParticipantFilter}
          showFilters={true}
        />
      </div>
    </div>
  );
}
