import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameMonth, isSameDay, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Users, Plus, Edit, Trash2 } from 'lucide-react';
import type { Meeting, CreateMeetingInput } from '@/lib/api/meetings';
import type { Participant } from '@/lib/api/participants';

interface MeetingCalendarProps {
  meetings: Meeting[];
  participants?: Participant[];
  onMeetingClick?: (meeting: Meeting) => void;
  onDateClick?: (date: Date) => void;
  onMeetingUpdate?: (meeting: Meeting) => void;
  onMeetingDelete?: (meetingId: string) => void;
  onMeetingCreate?: (meeting: CreateMeetingInput) => void;
  view?: 'month' | 'week';
  onViewChange?: (view: 'month' | 'week') => void;
  selectedParticipant?: string;
  onParticipantFilter?: (participantId: string) => void;
  showFilters?: boolean;
}

type ViewMode = 'month' | 'week';

export function MeetingCalendar({
  meetings,
  participants = [],
  onMeetingClick,
  onDateClick,
  onMeetingUpdate,
  onMeetingDelete,
  onMeetingCreate,
  view: initialView = 'month',
  onViewChange,
  selectedParticipant,
  onParticipantFilter,
  showFilters = false,
}: MeetingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date_time: '',
    notes: ''
  });

  // Filter meetings based on selected participant
  const filteredMeetings = meetings.filter(meeting => {
    if (!selectedParticipant) return true;
    return meeting.pair_id === selectedParticipant;
  });

  const handleViewChange = (newView: ViewMode) => {
    setViewMode(newView);
    onViewChange?.(newView);
  };

  const handlePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (onDateClick) {
      onDateClick(date);
    } else {
      setIsCreateDialogOpen(true);
    }
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    onMeetingClick?.(meeting);
  };

  const handleCreateMeeting = () => {
    if (!selectedDate || !formData.title || !selectedParticipant) {
      console.error('Missing required fields for meeting creation');
      return;
    }

    const newMeeting: CreateMeetingInput = {
      pair_id: selectedParticipant,
      title: formData.title,
      description: formData.notes,
      scheduled_at: selectedDate.toISOString(),
      duration_minutes: 60
    };

    onMeetingCreate?.(newMeeting);
    setIsCreateDialogOpen(false);
    setFormData({ title: '', date_time: '', notes: '' });
    setSelectedDate(null);
  };

  const handleUpdateMeeting = () => {
    if (!selectedMeeting) return;

    const updatedMeeting: Meeting = {
      ...selectedMeeting,
      title: formData.title,
      notes: formData.notes
    };

    onMeetingUpdate?.(updatedMeeting);
    setSelectedMeeting(null);
  };

  const handleDeleteMeeting = () => {
    if (!selectedMeeting) return;
    onMeetingDelete?.(selectedMeeting.id);
    setSelectedMeeting(null);
  };

  const getMeetingsForDate = (date: Date) => {
    return filteredMeetings.filter(meeting => 
      isSameDay(new Date(meeting.date_time), date)
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white rounded-lg border">
        <div className="grid grid-cols-7 gap-px border-b">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {days.map((day, idx) => {
            const dayMeetings = getMeetingsForDate(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={idx}
                className={`min-h-[80px] p-2 border-r cursor-pointer transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                } ${isCurrentDay ? 'bg-blue-50' : ''} hover:bg-gray-50`}
                onClick={() => handleDateClick(day)}
              >
                <div className={`text-sm font-medium ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'} ${isCurrentDay ? 'text-blue-600' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="mt-1 space-y-1">
                  {dayMeetings.slice(0, 2).map((meeting, i) => (
                    <div
                      key={i}
                      className="text-xs p-1 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMeetingClick(meeting);
                      }}
                    >
                      {format(new Date(meeting.date_time), 'HH:mm')} {meeting.title}
                    </div>
                  ))}
                  {dayMeetings.length > 2 && (
                    <div className="text-xs text-gray-500">+{dayMeetings.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(weekStart);
    const days = [];
    let day = weekStart;

    while (day <= weekEnd) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div className="bg-white rounded-lg border">
        <div className="grid grid-cols-8 gap-px border-b">
          <div className="p-2 text-sm font-medium text-gray-500">Time</div>
          {days.map(day => (
            <div key={day.toISOString()} className="p-2 text-center text-sm font-medium text-gray-500">
              <div>{format(day, 'EEE')}</div>
              <div className={`text-lg ${isToday(day) ? 'text-blue-600 font-bold' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="divide-y">
          {Array.from({ length: 12 }, (_, hour) => hour + 8).map(hour => (
            <div key={hour} className="grid grid-cols-8 gap-px">
              <div className="p-2 text-sm text-gray-500 border-r">
                {hour}:00
              </div>
              {days.map(day => {
                const dayMeetings = getMeetingsForDate(day).filter(meeting => {
                  const meetingHour = new Date(meeting.date_time).getHours();
                  return meetingHour === hour;
                });

                return (
                  <div key={day.toISOString()} className="p-1 border-r min-h-[60px]">
                    {dayMeetings.map(meeting => (
                      <div
                        key={meeting.id}
                        className="text-xs p-1 bg-blue-100 text-blue-800 rounded mb-1 cursor-pointer hover:bg-blue-200"
                        onClick={() => handleMeetingClick(meeting)}
                      >
                        <div className="font-medium truncate">{meeting.title}</div>
                        <div className="text-xs opacity-75">
                          {format(new Date(meeting.date_time), 'HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
            </CardTitle>
            <div className="flex items-center gap-2">
              {showFilters && participants.length > 0 && (
                <Select value={selectedParticipant || ''} onValueChange={onParticipantFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by participant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Participants</SelectItem>
                    {participants.map(participant => (
                      <SelectItem key={participant.id} value={participant.id}>
                        {participant.full_name || participant.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center gap-1 border rounded-lg">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange('month')}
                >
                  Month
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange('week')}
                >
                  Week
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Meeting
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar */}
      {viewMode === 'month' ? renderMonthView() : renderWeekView()}

      {/* Meeting Details Dialog */}
      <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meeting Details</DialogTitle>
            <DialogDescription>
              View and edit meeting information
            </DialogDescription>
          </DialogHeader>
          {selectedMeeting && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title || selectedMeeting.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || selectedMeeting.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {format(new Date(selectedMeeting.date_time), 'PPP p')}
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdateMeeting}>
                  <Edit className="h-4 w-4 mr-2" />
                  Update
                </Button>
                <Button variant="destructive" onClick={handleDeleteMeeting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button variant="outline" onClick={() => setSelectedMeeting(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Meeting Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Meeting</DialogTitle>
            <DialogDescription>
              Schedule a new meeting for {selectedDate && format(selectedDate, 'PPP')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Meeting title"
              />
            </div>
            <div>
              <Label htmlFor="notes">Agenda/Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Meeting agenda and notes"
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateMeeting} disabled={!formData.title}>
                Create Meeting
              </Button>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
