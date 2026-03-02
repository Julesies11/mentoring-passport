import { useState } from 'react';
import { useAllMeetings } from '@/hooks/use-meetings';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { format } from 'date-fns';
import { MeetingCalendar } from '@/components/calendar/meeting-calendar';
import { MeetingDialog } from '@/components/meetings/meeting-dialog';
import { toast } from 'sonner';
import { usePairing } from '@/providers/pairing-provider';

export function MenteeMeetingsPage() {
  const { pairings: pairs = [], selectedPairing: activePair } = usePairing();
  const { createMeeting, meetings = [], isLoading, isCreating } = useAllMeetings();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Filter meetings for the mentee
  const menteeMeetings = meetings.filter(m => 
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
            description="View and schedule your mentoring sessions"
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
                {menteeMeetings.filter(m => m.status === 'upcoming').slice(0, 3).map((meeting) => (
                  <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(meeting.meeting_type)}
                          <span className="text-base font-bold text-gray-900 truncate max-w-[150px]">
                            {meeting.task?.name || meeting.title}
                          </span>
                        </div>
                        <Badge variant="outline" className="bg-primary-light text-primary border-none text-[10px] uppercase font-bold">
                          Upcoming
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {meeting.pair?.mentor?.full_name?.charAt(0) || 'M'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Mentor</span>
                          <span className="text-sm font-semibold text-gray-800">
                            {meeting.pair?.mentor?.full_name || 'Unknown Mentor'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-gray-50">
                        <div className="flex items-center gap-2.5 text-sm text-gray-600 font-medium">
                          <KeenIcon icon="calendar" className="text-muted-foreground" />
                          {format(new Date(meeting.date_time), 'PPP')}
                        </div>
                        <div className="flex items-center gap-2.5 text-sm text-gray-600 font-medium">
                          <KeenIcon icon="time" className="text-muted-foreground" />
                          {format(new Date(meeting.date_time), 'p')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Full Calendar */}
              <MeetingCalendar 
                meetings={menteeMeetings}
                pairs={pairs}
                selectedParticipant={activePair?.id || ''}
                onMeetingCreate={handleCreateMeeting}
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
        isSubmitting={isCreating}
      />
    </>
  );
}
