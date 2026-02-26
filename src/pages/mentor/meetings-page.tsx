import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useAllMeetings } from '@/hooks/use-meetings';
import { useUserPairs } from '@/hooks/use-pairs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { MeetingCalendar } from '@/components/calendar/meeting-calendar';

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
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [formData, setFormData] = useState({
    pair_id: '',
    title: '',
    description: '',
    scheduled_at: '',
    location: '',
    meeting_type: 'in_person' as const
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'in_person':
        return 'bg-purple-100 text-purple-800';
      case 'virtual':
        return 'bg-indigo-100 text-indigo-800';
      case 'phone':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCreateMeeting = async () => {
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
      setSelectedMeeting(null);
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
    try {
      await deleteMeeting(meetingId);
      setSelectedMeeting(null);
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container-fixed">
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
            <p className="text-sm text-gray-600">Loading meetings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-600">
            Schedule and manage your mentoring meetings
          </p>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-blue-50">
              {meetings.filter(m => m.status === 'upcoming').length} Scheduled
            </Badge>
            <Badge variant="outline" className="bg-green-50">
              {meetings.filter(m => m.status === 'completed').length} Completed
            </Badge>
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
                  Schedule a meeting with one of your mentees
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pair">Mentee</Label>
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
                
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Meeting title"
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Meeting description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="scheduled_at">Date & Time</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Meeting location or video link"
                  />
                </div>
                
                <div>
                  <Label htmlFor="meeting_type">Type</Label>
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
                
                <div className="flex gap-2">
                  <Button onClick={handleCreateMeeting} className="flex-1">
                    Schedule Meeting
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {meetings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Meetings Scheduled
                </h3>
                <p className="text-gray-600 mb-4">
                  Start by scheduling your first meeting with a mentee.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Meeting
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <Card key={meeting.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                      <CardDescription>
                        With {meeting.pair?.mentee?.full_name || 'Unknown Mentee'}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(meeting.status)}>
                        {meeting.status}
                      </Badge>
                      <Badge className={getTypeColor(meeting.meeting_type)}>
                        {meeting.meeting_type?.replace('_', ' ') || 'Regular'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(meeting.date_time), 'PPP p')}
                      </div>
                      {meeting.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {meeting.location}
                        </div>
                      )}
                    </div>
                    
                    {meeting.notes && (
                      <p className="text-gray-700">{meeting.notes}</p>
                    )}
                    
                    <div className="flex gap-2">
                      {meeting.status === 'upcoming' && (
                        <>
                          <Button size="sm" onClick={() => handleUpdateMeeting(meeting.id, 'completed')}>
                            Mark Complete
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleUpdateMeeting(meeting.id, 'cancelled')}>
                            Cancel
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setSelectedMeeting(meeting)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteMeeting(meeting.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

        {/* Calendar Section */}
        <div className="mt-8">
          <MeetingCalendar
          meetings={mentorMeetings}
          selectedParticipant={activePair?.id || ''}
          onMeetingCreate={handleCreateMeeting}
          onMeetingUpdate={handleCalendarUpdate}
          onMeetingDelete={handleDeleteMeeting}
        />
      </div>
    </div>
  );
}
