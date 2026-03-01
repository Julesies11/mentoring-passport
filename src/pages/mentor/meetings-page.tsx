import { Fragment, useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useAllMeetings } from '@/hooks/use-meetings';
import { usePairTasks } from '@/hooks/use-tasks';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons';
import { format } from 'date-fns';
import { MeetingCalendar } from '@/components/calendar/meeting-calendar';
import { cn } from '@/lib/utils';
import { usePairing } from '@/providers/pairing-provider';
import { useSearchParams } from 'react-router-dom';
import { MeetingDialog } from '@/components/meetings/meeting-dialog';
import { PairingSelector } from '@/components/common/pairing-selector';

export function MentorMeetingsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { createMeeting, updateMeeting, deleteMeeting, meetings = [], isLoading, isCreating } = useAllMeetings();
  const { pairings: pairs = [], selectedPairing: activePair } = usePairing();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [initialTaskId, setInitialTaskId] = useState<string | null>(null);

  // Handle search params for pre-filling
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === 'true';
    const taskId = searchParams.get('taskId');

    if (shouldCreate) {
      setIsCreateDialogOpen(true);
      setInitialTaskId(taskId);
      
      // Clear search params after reading
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      newParams.delete('taskId');
      newParams.delete('pairId');
      setSearchParams(newParams);
    }
  }, [searchParams]);

  // Filter meetings for the selected pair
  const mentorMeetings = meetings.filter(meeting => 
    meeting.pair_id === activePair?.id
  );

  const handleCreateMeeting = async (data: any) => {
    try {
      await createMeeting(data);
      setIsCreateDialogOpen(false);
      setInitialTaskId(null);
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  };

  const handleUpdateMeeting = async (meetingId: string, status: string) => {
    try {
      await updateMeeting(meetingId, { status });
    } catch (error) {
      console.error('Error updating meeting:', error);
    }
  };

  const handleCalendarUpdate = async (meeting: any) => {
    try {
      await updateMeeting(meeting.id, {
        title: meeting.title,
        notes: meeting.notes,
      });
    } catch (error) {
      console.error('Error updating meeting:', error);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (confirm('Are you sure you want to delete this meeting?')) {
      try {
        await deleteMeeting(meetingId);
      } catch (error) {
        console.error('Error deleting meeting:', error);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-blue-500 text-white border-none">Upcoming</Badge>;
      case 'completed':
        return <Badge className="bg-success text-white border-none">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-danger text-white border-none">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'in_person':
        return <KeenIcon icon="people" className="text-purple-500" />;
      case 'virtual':
        return <KeenIcon icon="video" className="text-primary" />;
      case 'phone':
        return <KeenIcon icon="phone" className="text-warning" />;
      default:
        return <KeenIcon icon="calendar" className="text-gray-400" />;
    }
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Mentoring Meetings"
            description="Schedule and manage your mentoring sessions"
          />
          <ToolbarActions>
            <div className="flex gap-2">
              <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!activePair}>
                <KeenIcon icon="plus" />
                Schedule Meeting
              </Button>

              <MeetingDialog 
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                pairId={activePair?.id || ''}
                initialTaskId={initialTaskId}
                onSubmit={handleCreateMeeting}
                isSubmitting={isCreating}
              />
            </div>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <PairingSelector />
        
        <div className="grid gap-5 lg:gap-7.5">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
              <p>Loading meetings...</p>
            </div>
          ) : !activePair ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <KeenIcon icon="user" className="text-3xl text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Relationship Selected</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Please select a mentoring relationship from the dropdown above to view your meetings.
                </p>
              </CardContent>
            </Card>
          ) : mentorMeetings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <KeenIcon icon="calendar-add" className="text-3xl text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Meetings Scheduled</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-6">
                  You haven't scheduled any mentoring meetings yet for this relationship.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <KeenIcon icon="plus" />
                  Schedule First Meeting
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7.5">
              {mentorMeetings.map((meeting) => (
                <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3 border-b border-gray-100 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                          {getTypeIcon(meeting.meeting_type)}
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-gray-900">{meeting.title}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            With {meeting.pair?.mentee?.full_name || 'Unknown Mentee'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(meeting.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                        <KeenIcon icon="calendar" className="text-muted-foreground" />
                        {format(new Date(meeting.date_time), 'PPP')}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                        <KeenIcon icon="time" className="text-muted-foreground" />
                        {format(new Date(meeting.date_time), 'p')}
                      </div>
                      {meeting.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium sm:col-span-2">
                          <KeenIcon icon="geolocation" className="text-muted-foreground" />
                          <span className="truncate">{meeting.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {meeting.notes && (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                        <p className="text-sm text-gray-700 leading-relaxed italic">
                          "{meeting.notes}"
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      {meeting.status === 'upcoming' && (
                        <Fragment>
                          <Button size="sm" variant="outline" className="flex-1 bg-success-light text-success border-transparent hover:bg-success hover:text-white" onClick={() => handleUpdateMeeting(meeting.id, 'completed')}>
                            <KeenIcon icon="check-circle" />
                            Complete
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 bg-danger-light text-danger border-transparent hover:bg-danger hover:text-white" onClick={() => handleUpdateMeeting(meeting.id, 'cancelled')}>
                            <KeenIcon icon="cross-circle" />
                            Cancel
                          </Button>
                        </Fragment>
                      )}
                      <Button size="sm" variant="ghost" mode="icon" onClick={() => handleDeleteMeeting(meeting.id)}>
                        <KeenIcon icon="trash" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Calendar Section */}
          {activePair && mentorMeetings.length > 0 && (
            <div className="mt-5 lg:mt-7.5">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Meeting Calendar</h3>
              <MeetingCalendar
                meetings={mentorMeetings}
                selectedParticipant={activePair?.id || ''}
                onMeetingCreate={handleCreateMeeting}
                onMeetingUpdate={handleCalendarUpdate}
                onMeetingDelete={handleDeleteMeeting}
              />
            </div>
          )}
        </div>
      </Container>
    </Fragment>
  );
}
