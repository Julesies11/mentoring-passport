import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameMonth, isSameDay, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Edit, 
  Trash2,
  UserCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Meeting } from '@/lib/api/meetings';
import type { Participant } from '@/lib/api/participants';

interface MetronicCalendarProps {
  meetings: Meeting[];
  participants?: Participant[];
  onMeetingClick?: (meeting: Meeting) => void;
  onDateClick?: (date: Date) => void;
  onMeetingUpdate?: (meeting: Meeting) => void;
  onMeetingDelete?: (meetingId: string) => void;
  onMeetingCreate?: (meeting: Omit<Meeting, 'id'>) => void;
  view?: 'month' | 'week';
  onViewChange?: (view: 'month' | 'week') => void;
  selectedParticipant?: string;
  onParticipantFilter?: (participantId: string) => void;
  showFilters?: boolean;
}

type ViewMode = 'month' | 'week';

export function MetronicCalendar({
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
}: MetronicCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const filteredMeetings = selectedParticipant
    ? meetings.filter(meeting => meeting.participant_id === selectedParticipant)
    : meetings;

  const getDaysInMonth = () => {
    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const getMeetingsForDay = (day: Date) => {
    return filteredMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.date_time);
      return isSameDay(meetingDate, day);
    });
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <div className="h-4 w-4 rounded-full bg-green-500" />;
      case 'cancelled':
        return <div className="h-4 w-4 rounded-full bg-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-500" />;
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(prev => subWeeks(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addWeeks(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    onDateClick?.(day);
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    onMeetingClick?.(meeting);
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-0">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-xl font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <CardDescription>
              {filteredMeetings.length} meetings this month
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
            >
              Today
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            {showFilters && (
              <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Meeting
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-sm font-medium text-muted-foreground text-center py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {getDaysInMonth().map((day, index) => {
              const dayMeetings = getMeetingsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              
              return (
                <div
                  key={index}
                  className={cn(
                    'min-h-[100px] p-2 border rounded-lg transition-all cursor-pointer hover:bg-muted/50',
                    !isCurrentMonth && 'opacity-50',
                    isTodayDate && 'border-primary bg-primary/10',
                    selectedDate && isSameDay(day, selectedDate) && 'ring-2 ring-primary'
                  )}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {dayMeetings.slice(0, 2).map((meeting, meetingIndex) => (
                      <div
                        key={meetingIndex}
                        className="text-xs p-1 rounded bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMeetingClick(meeting);
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {getStatusIcon(meeting.status)}
                          <span className="truncate font-medium">
                            {meeting.title}
                          </span>
                        </div>
                        {meeting.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{meeting.location}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {dayMeetings.length > 2 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayMeetings.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
            <CardDescription>
              {getMeetingsForDay(selectedDate).length} meetings scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getMeetingsForDay(selectedDate).map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleMeetingClick(meeting)}
                >
                  <div className="mt-1">
                    {getStatusIcon(meeting.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{meeting.title}</h4>
                        {meeting.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {meeting.description}
                          </p>
                        )}
                        {meeting.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            {meeting.location}
                          </div>
                        )}
                      </div>
                      <Badge className={cn('shrink-0', getStatusColor(meeting.status))}>
                        {meeting.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              
              {getMeetingsForDay(selectedDate).length === 0 && (
                <div className="text-center py-8">
                  <UserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No meetings scheduled for this day
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Meeting Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogDescription>
              Create a new meeting for {format(selectedDate || new Date(), 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter meeting title"
                defaultValue=""
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter meeting description"
                rows={3}
                defaultValue=""
              />
            </div>
            
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Enter meeting location"
                defaultValue=""
              />
            </div>
            
            <div>
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                defaultValue="09:00"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // Handle meeting creation
              setIsCreateDialogOpen(false);
            }}>
              Schedule Meeting
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Details Dialog */}
      {selectedMeeting && (
        <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Meeting Details</DialogTitle>
              <DialogDescription>
                {format(new Date(selectedMeeting.date_time), 'MMMM d, yyyy at h:mm a')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title</Label>
                <p className="font-medium">{selectedMeeting.title}</p>
              </div>
              
              {selectedMeeting.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-muted-foreground">{selectedMeeting.description}</p>
                </div>
              )}
              
              {selectedMeeting.location && (
                <div>
                  <Label>Location</Label>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {selectedMeeting.location}
                  </p>
                </div>
              )}
              
              <div>
                <Label>Status</Label>
                <Badge className={getStatusColor(selectedMeeting.status)}>
                  {selectedMeeting.status}
                </Badge>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setSelectedMeeting(null)}>
                Close
              </Button>
              <Button variant="destructive" onClick={() => {
                onMeetingDelete?.(selectedMeeting.id);
                setSelectedMeeting(null);
              }}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
