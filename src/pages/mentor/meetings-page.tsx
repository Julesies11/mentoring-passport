import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useAllMeetings } from '@/hooks/use-meetings';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { format } from 'date-fns';
import { MeetingCalendar } from '@/components/calendar/meeting-calendar';
import { MeetingDialog } from '@/components/meetings/meeting-dialog';
import { toast } from 'sonner';
import { usePairing } from '@/providers/pairing-provider';

export function MentorMeetingsPage() {
  const { pairings: pairs = [], selectedPairing: activePair } = usePairing();
  const { 
    meetings = [], 
    isLoading, 
    createMeeting, 
    updateMeeting, 
    deleteMeeting 
  } = useAllMeetings();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Filter meetings for the mentor
  const mentorMeetings = meetings.filter(m => 
    pairs.some(p => p.id === m.pair_id)
  );

  const handleCreateMeeting = async (data: any) => {
    try {
      await createMeeting(data);
      setIsCreateDialogOpen(false);
      toast.success('Meeting scheduled successfully');
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to schedule meeting');
    }
  };

  const handleUpdateMeeting = async (meetingId: string, status: 'upcoming' | 'completed' | 'cancelled') => {
    try {
      await updateMeeting(meetingId, { status });
      toast.success(`Meeting marked as ${status}`);
    } catch (error) {
      console.error('Error updating meeting:', error);
      toast.error('Failed to update meeting');
    }
  };

  const handleCalendarUpdate = async (meeting: any) => {
    try {
      const { id, ...updates } = meeting;
      await updateMeeting(id, updates);
      toast.success('Meeting updated successfully');
    } catch (err) {
      console.error('Error updating meeting:', err);
      toast.error('Failed to update meeting');
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (confirm('Are you sure you want to delete this meeting?')) {
      try {
        await deleteMeeting(meetingId);
        toast.success('Meeting deleted successfully');
      } catch (error) {
        console.error('Error deleting meeting:', error);
        toast.error('Failed to delete meeting');
      }
    }
  };

  const getTypeIcon = (type?: string | null) => {
    switch (type) {
      case 'in_person':
        return <KeenIcon icon="geolocation" className="text-primary" />;
      case 'virtual':
        return <KeenIcon icon="video" className="text-primary" />;
      case 'phone':
        return <KeenIcon icon="phone" className="text-primary" />;
      default:
        return <KeenIcon icon="calendar" className="text-gray-400" />;
    }
  };

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Mentoring Meetings"
            description="Schedule and manage your mentoring sessions"
          />
          <ToolbarActions>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <KeenIcon icon="plus" />
              Schedule Meeting
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
              <p>Loading meetings...</p>
            </div>
          ) : (
            <div className="space-y-7.5">
              {/* Upcoming Meetings Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {mentorMeetings.filter(m => m.status === 'upcoming').slice(0, 3).map((meeting) => (
                  <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3 border-b border-gray-100 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(meeting.meeting_type)}
                          <CardTitle className="text-base font-bold text-gray-900 truncate max-w-[150px]">
                            {meeting.task?.name || meeting.title}
                          </CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-primary-light text-primary border-none text-[10px] uppercase font-bold">
                          Upcoming
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {meeting.pair?.mentee?.full_name?.charAt(0) || 'M'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Mentee</span>
                          <span className="text-sm font-semibold text-gray-800">
                            {meeting.pair?.mentee?.full_name || 'Unknown Mentee'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-2">
                        <div className="flex items-center gap-2.5 text-sm text-gray-600 font-medium">
                          <KeenIcon icon="calendar" className="text-muted-foreground" />
                          {format(new Date(meeting.date_time), 'PPP')}
                        </div>
                        <div className="flex items-center gap-2.5 text-sm text-gray-600 font-medium">
                          <KeenIcon icon="time" className="text-muted-foreground" />
                          {format(new Date(meeting.date_time), 'p')}
                        </div>
                        {meeting.location && (
                          <div className="flex items-center gap-2.5 text-sm text-gray-600 font-medium">
                            <KeenIcon icon="geolocation" className="text-muted-foreground" />
                            <span className="truncate">{meeting.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <>
                          <Button size="sm" variant="outline" className="flex-1 bg-success-light text-success border-transparent hover:bg-success hover:text-white" onClick={() => handleUpdateMeeting(meeting.id, 'completed')}>
                            <KeenIcon icon="check-circle" />
                            Complete
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 bg-danger-light text-danger border-transparent hover:bg-danger hover:text-white" onClick={() => handleUpdateMeeting(meeting.id, 'cancelled')}>
                            <KeenIcon icon="cross-circle" />
                            Cancel
                          </Button>
                        </>
                        <Button size="sm" variant="ghost" mode="icon" onClick={() => handleDeleteMeeting(meeting.id)}>
                          <KeenIcon icon="trash" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Full Calendar */}
              <MeetingCalendar 
                meetings={mentorMeetings}
                pairs={pairs}
                selectedParticipant={activePair?.id || ''}
                onMeetingCreate={handleCreateMeeting}
                onMeetingUpdate={handleCalendarUpdate}
                onMeetingDelete={handleDeleteMeeting}
                showAddButton={false}
              />
            </div>
          )}
        </div>
      </Container>

      {/* Meeting Dialog */}
      <MeetingDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        pairId={activePair?.id || ''}
        onSubmit={handleCreateMeeting}
      />
    </>
  );
}
