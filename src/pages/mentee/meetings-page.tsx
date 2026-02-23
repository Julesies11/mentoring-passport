import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { useAllMeetings } from '@/hooks/use-meetings';
import { createMeeting } from '@/lib/api/meetings';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Clock, MapPin, Users, Video, Plus } from 'lucide-react';
import { format } from 'date-fns';

export function MenteeMeetingsPage() {
  const { user } = useAuth();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const { meetings = [] } = useAllMeetings();
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
    meeting.status === 'upcoming' && new Date(meeting.date_time) > new Date()
  );

  const pastMeetings = menteeMeetings.filter(meeting => 
    meeting.status === 'completed' || new Date(meeting.date_time) <= new Date()
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

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
            <p className="text-sm text-gray-600">View and schedule meetings with your mentor</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Meeting</DialogTitle>
                <DialogDescription>
                  Request a meeting with your mentor to discuss your progress and goals.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Monthly Check-in, Goal Review"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="date_time">Date & Time</Label>
                  <Input
                    id="date_time"
                    type="datetime-local"
                    value={formData.date_time}
                    onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Agenda/Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="What would you like to discuss in this meeting?"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">Send Request</Button>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7.5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Meetings
              </CardTitle>
              <CardDescription>
                Your scheduled meetings with your mentor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Upcoming Meetings</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Schedule a meeting with your mentor to discuss your progress.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingMeetings.map((meeting) => (
                    <Card key={meeting.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{meeting.title}</h4>
                          <Badge variant="outline">Upcoming</Badge>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {format(new Date(meeting.date_time), 'PPP p')}
                          </div>
                          {meeting.notes && (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5" />
                              <span>{meeting.notes}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline">
                            <Video className="h-4 w-4 mr-1" />
                            Join
                          </Button>
                          <Button size="sm" variant="ghost">
                            Reschedule
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Past Meetings
              </CardTitle>
              <CardDescription>
                Your meeting history with your mentor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pastMeetings.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Past Meetings</h3>
                  <p className="text-sm text-muted-foreground">
                    Your meeting history will appear here once you've had meetings with your mentor.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pastMeetings.map((meeting) => (
                    <Card key={meeting.id} className="opacity-75">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold">{meeting.title}</h4>
                          <Badge variant={meeting.status === 'completed' ? 'default' : 'secondary'}>
                            {meeting.status === 'completed' ? 'Completed' : 'Cancelled'}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {format(new Date(meeting.date_time), 'PPP p')}
                          </div>
                          {meeting.notes && (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5" />
                              <span>{meeting.notes}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline">
                            View Notes
                          </Button>
                          <Button size="sm" variant="ghost">
                            Request Follow-up
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Meeting Guidelines</CardTitle>
            <CardDescription>Tips for productive mentor-mentee meetings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Prepare Agenda</h4>
                  <p className="text-sm text-muted-foreground">
                    Come prepared with topics you want to discuss and questions you need answered.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Be Punctual</h4>
                  <p className="text-sm text-muted-foreground">
                    Respect your mentor's time by joining meetings on time and being ready to engage.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Follow Up</h4>
                  <p className="text-sm text-muted-foreground">
                    Send a thank you note and summarize key takeaways and action items.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
