import { Fragment, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { useAllMeetings } from '@/hooks/use-meetings';
import { createMeeting } from '@/lib/api/meetings';
import { useQueryClient } from '@tanstack/react-query';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { KeenIcon } from '@/components/keenicons';
import { format } from 'date-fns';
import { MeetingCalendar } from '@/components/calendar/meeting-calendar';
import { cn } from '@/lib/utils';

export function MenteeMeetingsPage() {
  const { user } = useAuth();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const { meetings = [], isLoading } = useAllMeetings();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    date_time: '',
    notes: ''
  });

  // Filter meetings for mentee's pairs
  const menteeMeetings = meetings.filter(meeting => 
    pairs.some(pair => pair.id === meeting.pair_id)
  );

  const upcomingMeetings = menteeMeetings.filter(meeting => 
    meeting.status === 'upcoming'
  );

  const pastMeetings = menteeMeetings.filter(meeting => 
    meeting.status === 'completed' || meeting.status === 'cancelled'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pairs.length === 0) {
      console.error('No mentor pair found');
      return;
    }

    try {
      // Get the first pair (mentee should only have one mentor)
      const pair = pairs[0];
      
      await createMeeting({
        pair_id: pair.id,
        title: formData.title,
        description: formData.notes,
        scheduled_at: new Date(formData.date_time).toISOString(),
        duration_minutes: 60, // Default 1 hour
        location: 'Virtual' // Default location
      });

      // Reset form and close dialog
      setIsCreateDialogOpen(false);
      setFormData({ title: '', date_time: '', notes: '' });
      
      // Refresh meetings data using React Query
      queryClient.invalidateQueries({ queryKey: ['all-meetings'] });
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  };

  const handleCreateMeeting = async (meetingData: any) => {
    if (pairs.length === 0) return;
    
    try {
      const pair = pairs[0];
      await createMeeting({
        ...meetingData,
        pair_id: pair.id,
      });
      queryClient.invalidateQueries({ queryKey: ['all-meetings'] });
    } catch (error) {
      console.error('Error creating meeting:', error);
    }
  };

  const handleUpdateMeeting = async (meeting: any) => {
    console.log('Meeting update restricted for mentees');
  };

  const handleCalendarUpdate = async (meeting: any) => {
    console.log('Meeting update restricted for mentees');
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    console.log('Meeting deletion restricted for mentees');
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
            title="Meetings"
            description="View and schedule meetings with your mentor"
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7.5">
              {/* Upcoming Meetings */}
              <Card className="flex flex-col h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <KeenIcon icon="calendar-tick" className="text-primary text-xl" />
                    <CardTitle>Upcoming Meetings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  {upcomingMeetings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <KeenIcon icon="calendar" className="text-2xl text-gray-400" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">No Upcoming Meetings</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
                        Schedule a meeting with your mentor to discuss your progress.
                      </p>
                      <Button size="sm" variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
                        <KeenIcon icon="plus" />
                        Schedule Meeting
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingMeetings.map((meeting) => (
                        <div key={meeting.id} className="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-gray-900">{meeting.title}</h4>
                            {getStatusBadge(meeting.status)}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <KeenIcon icon="calendar" className="text-muted-foreground text-sm" />
                              {format(new Date(meeting.date_time), 'PPP')}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <KeenIcon icon="time" className="text-muted-foreground text-sm" />
                              {format(new Date(meeting.date_time), 'p')}
                            </div>
                            {meeting.notes && (
                              <div className="flex items-start gap-1.5 sm:col-span-2 mt-1">
                                <KeenIcon icon="notepad" className="text-muted-foreground text-sm mt-0.5" />
                                <span className="line-clamp-2">{meeting.notes}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Button size="xs" variant="outline" className="flex-1">
                              <KeenIcon icon="video" />
                              Join Meeting
                            </Button>
                            <Button size="xs" variant="ghost">
                              Reschedule
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Past Meetings */}
              <Card className="flex flex-col h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <KeenIcon icon="history" className="text-gray-400 text-xl" />
                    <CardTitle>Meeting History</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  {pastMeetings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <KeenIcon icon="time" className="text-2xl text-gray-400" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">No Past Meetings</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-xs">
                        Your meeting history will appear here once you've had sessions with your mentor.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pastMeetings.map((meeting) => (
                        <div key={meeting.id} className="p-4 rounded-lg border border-gray-100 opacity-80 hover:opacity-100 transition-opacity">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-800">{meeting.title}</h4>
                            <Badge variant="outline" className={cn(
                              'border-none capitalize',
                              meeting.status === 'completed' ? 'bg-success-light text-success' : 'bg-gray-100 text-gray-500'
                            )}>
                              {meeting.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <KeenIcon icon="calendar" className="text-xs" />
                              {format(new Date(meeting.date_time), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1">
                              <KeenIcon icon="time" className="text-xs" />
                              {format(new Date(meeting.date_time), 'p')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="size-10 rounded-lg bg-primary-light flex items-center justify-center text-primary">
                    <span className="font-bold">01</span>
                  </div>
                  <h4 className="font-bold text-gray-900">Prepare Agenda</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Come prepared with topics you want to discuss and specific questions you need answered to make the most of the time.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="size-10 rounded-lg bg-success-light flex items-center justify-center text-success">
                    <span className="font-bold">02</span>
                  </div>
                  <h4 className="font-bold text-gray-900">Be Punctual</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Respect your mentor's time by joining meetings on time and being ready to engage in productive dialogue.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="size-10 rounded-lg bg-warning-light flex items-center justify-center text-warning">
                    <span className="font-bold">03</span>
                  </div>
                  <h4 className="font-bold text-gray-900">Follow Up</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    After each meeting, summarize key takeaways and action items, and share them with your mentor for alignment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Section */}
          <div className="space-y-4 mt-5">
            <h3 className="text-lg font-bold text-gray-900">Program Calendar</h3>
            <MeetingCalendar
              meetings={menteeMeetings}
              onMeetingCreate={handleCreateMeeting}
              onMeetingUpdate={handleCalendarUpdate}
              onMeetingDelete={handleDeleteMeeting}
            />
          </div>
        </div>
      </Container>

      {/* Schedule Meeting Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogDescription>
              Request a meeting with your mentor to discuss your progress and goals.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-gray-900 font-semibold">Meeting Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Monthly Check-in, Goal Review"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date_time" className="text-gray-900 font-semibold">Preferred Date & Time *</Label>
              <Input
                id="date_time"
                type="datetime-local"
                value={formData.date_time}
                onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-gray-900 font-semibold">Agenda / Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="What would you like to discuss in this meeting?"
                rows={3}
                className="resize-none"
              />
            </div>
            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <KeenIcon icon="send" />
                Send Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

