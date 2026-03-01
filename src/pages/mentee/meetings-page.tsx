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
import { usePairing } from '@/providers/pairing-provider';
import { useSearchParams } from 'react-router-dom';

export function MenteeMeetingsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { createMeeting, updateMeeting, deleteMeeting, meetings = [], isLoading } = useAllMeetings();
  const { pairings: pairs = [], selectedPairing: activePair } = usePairing();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    pair_id: '',
    title: '',
    description: '',
    scheduled_at: '',
    location: 'Virtual',
    meeting_type: 'virtual' as const,
    pair_task_id: ''
  });

  // Fetch tasks for the selected pair in the form
  const { tasks = [] } = usePairTasks(formData.pair_id);

  // Handle search params for pre-filling
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === 'true';
    const taskId = searchParams.get('taskId');
    const pairId = searchParams.get('pairId');

    if (shouldCreate) {
      setIsCreateDialogOpen(true);
      setFormData(prev => ({
        ...prev,
        pair_id: pairId || activePair?.id || '',
        pair_task_id: taskId || '',
        title: taskId ? 'Task Discussion' : prev.title
      }));
      
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('create');
      newParams.delete('taskId');
      newParams.delete('pairId');
      setSearchParams(newParams);
    } else if (activePair && !formData.pair_id) {
      setFormData(prev => ({ ...prev, pair_id: activePair.id }));
    }
  }, [searchParams, activePair]);

  // Filter meetings for mentee's pairs
  const menteeMeetings = meetings.filter(meeting => 
    pairs.some(pair => pair.id === meeting.pair_id)
  );

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

  const handleCreateMeeting = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      await createMeeting({
        ...formData,
        scheduled_at: new Date(formData.scheduled_at).toISOString(),
        pair_task_id: formData.pair_task_id === 'none' ? undefined : (formData.pair_task_id || undefined)
      });
      setIsCreateDialogOpen(false);
      setFormData({
        pair_id: activePair?.id || '',
        title: '',
        description: '',
        scheduled_at: '',
        location: 'Virtual',
        meeting_type: 'virtual',
        pair_task_id: ''
      });
    } catch (error) {
      console.error('Error creating meeting:', error);
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
          ) : menteeMeetings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <KeenIcon icon="calendar-add" className="text-3xl text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Meetings Scheduled</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  You haven't scheduled any mentoring meetings yet. Start by scheduling your first session.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7.5">
              {menteeMeetings.map((meeting) => (
                <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3 border-b border-gray-100 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 text-primary">
                          <KeenIcon icon="calendar" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-gray-900">{meeting.title}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            With {meeting.pair?.mentor?.full_name || 'Your Mentor'}
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
                    </div>
                    
                    {meeting.notes && (
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                        <p className="text-sm text-gray-700 italic">"{meeting.notes}"</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Calendar Section */}
          <div className="mt-5 lg:mt-7.5">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Program Calendar</h3>
            <MeetingCalendar
              meetings={menteeMeetings}
              onMeetingCreate={handleCreateMeeting}
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
              Schedule a meeting with your mentor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMeeting} className="grid gap-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pair" className="text-gray-900 font-semibold">Mentor *</Label>
                <Select value={formData.pair_id} onValueChange={(value) => setFormData({...formData, pair_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mentor" />
                  </SelectTrigger>
                  <SelectContent>
                    {pairs.map((pair) => (
                      <SelectItem key={pair.id} value={pair.id}>
                        {pair.mentor?.full_name || 'Your Mentor'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pair_task_id" className="text-gray-900 font-semibold">Link to Task</Label>
                <Select value={formData.pair_task_id} onValueChange={(value) => setFormData({...formData, pair_task_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional: Select task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <Label htmlFor="description" className="text-gray-900 font-semibold">Agenda / Notes</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="What would you like to discuss?"
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
    </Fragment>
  );
}
