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

export function MenteeMeetingsPage() {
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
      
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      newParams.delete('taskId');
      newParams.delete('pairId');
      setSearchParams(newParams);
    }
  }, [searchParams]);

  // Filter meetings for the selected pair
  const menteeMeetings = meetings.filter(meeting => 
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge className="bg-primary text-white border-none">Upcoming</Badge>;
      case 'completed':
        return <Badge className="bg-success text-white border-none">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-danger text-white border-none">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
          ) : menteeMeetings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <KeenIcon icon="calendar-add" className="text-3xl text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Meetings Scheduled</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-6">
                  You don't have any mentoring meetings scheduled for this relationship yet.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <KeenIcon icon="plus" />
                  Schedule First Meeting
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7.5">
              {menteeMeetings.map((meeting) => (
                <Card key={meeting.id}>
                  <CardHeader className="pb-3 border-b border-gray-100 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <CardTitle className="text-base font-bold text-gray-900">{meeting.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          With {meeting.pair?.mentor?.full_name || 'Your Mentor'}
                        </p>
                      </div>
                      {getStatusBadge(meeting.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <KeenIcon icon="calendar" className="text-muted-foreground" />
                        {format(new Date(meeting.date_time), 'PPP')}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <KeenIcon icon="time" className="text-muted-foreground" />
                        {format(new Date(meeting.date_time), 'p')}
                      </div>
                    </div>
                    {meeting.notes && (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm text-gray-600 leading-relaxed italic">
                          "{meeting.notes}"
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activePair && menteeMeetings.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 px-1">Meeting Calendar</h3>
              <MeetingCalendar
                meetings={menteeMeetings}
                selectedParticipant={activePair?.id || ''}
                onMeetingCreate={handleCreateMeeting}
              />
            </div>
          )}
        </div>
      </Container>
    </Fragment>
  );
}
