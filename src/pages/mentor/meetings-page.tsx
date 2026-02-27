import { Fragment, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useAllMeetings } from '@/hooks/use-meetings';
import { useUserPairs } from '@/hooks/use-pairs';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KeenIcon } from '@/components/keenicons';
import { format } from 'date-fns';
import { MeetingCalendar } from '@/components/calendar/meeting-calendar';
import { cn } from '@/lib/utils';

export function MentorMeetingsPage() {
  const { user } = useAuth();
  const { createMeeting, updateMeeting, deleteMeeting, meetings = [], isLoading } = useAllMeetings();
  const { data: pairs = [] } = useUserPairs(user?.id || '');

  // Get active pair
  const activePair = pairs.find(p => p.status === 'active');

  // Filter meetings for mentor's pairs
  const mentorMeetings = meetings.filter(meeting => 
    pairs.some(pair => pair.id === meeting.pair_id)
  );

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    pair_id: '',
    title: '',
    description: '',
    scheduled_at: '',
    location: '',
    meeting_type: 'in_person' as const
  });

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

  const handleCreateMeeting = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      await createMeeting({
        ...formData,
        scheduled_at: new Date(formData.scheduled_at).toISOString()
      });
      setIsCreateDialogOpen(false);
      setFormData({
        pair_id: '',
        title: '',
        description: '',
        scheduled_at: '',
        location: '',
        meeting_type: 'in_person'
      });
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

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Meetings"
            description="Schedule and manage your mentoring meetings"
          />
          <ToolbarActions>
            <div className="flex gap-2">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <KeenIcon icon="plus" />
                    Schedule Meeting
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Schedule New Meeting</DialogTitle>
                    <DialogDescription>
                      Schedule a meeting with one of your mentees.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateMeeting} className="grid gap-5 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pair" className="text-gray-900 font-semibold">Mentee *</Label>
                      <Select value={formData.pair_id} onValueChange={(value) => setFormData({...formData, pair_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select mentee" />
                        </SelectTrigger>
                        <SelectContent>
                          {pairs.map((pair) => (
                            <SelectItem key={pair.id} value={pair.id}>
                              {pair.mentee?.full_name || 'Unknown'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="title" className="text-gray-900 font-semibold">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="e.g., Weekly Progress Review"
                        required
                      />
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="description" className="text-gray-900 font-semibold">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="What will you discuss?"
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="scheduled_at" className="text-gray-900 font-semibold">Date & Time *</Label>
                        <Input
                          id="scheduled_at"
                          type="datetime-local"
                          value={formData.scheduled_at}
                          onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="meeting_type" className="text-gray-900 font-semibold">Type</Label>
                        <Select value={formData.meeting_type} onValueChange={(value: any) => setFormData({...formData, meeting_type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in_person">In Person</SelectItem>
                            <SelectItem value="virtual">Virtual</SelectItem>
                            <SelectItem value="phone">Phone Call</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="location" className="text-gray-900 font-semibold">Location / Link</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        placeholder="Office #204 or Zoom link"
                      />
                    </div>
                    
                    <DialogFooter className="pt-4 gap-2 sm:gap-0">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        Schedule Meeting
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
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
          ) : mentorMeetings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <KeenIcon icon="calendar-add" className="text-3xl text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Meetings Scheduled</h3>
                <p className="text-muted-foreground text-center max-w-sm mb-6">
                  You haven't scheduled any mentoring meetings yet. Start by scheduling your first session.
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
        </div>
      </Container>
    </Fragment>
  );
}

