import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addWeeks, 
  subWeeks, 
  addMonths, 
  subMonths, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Edit, Trash2 } from 'lucide-react';
import type { Meeting, CreateMeetingInput } from '@/lib/api/meetings';
import type { Pair } from '@/lib/api/pairs';
import { MeetingDialog } from '@/components/meetings/meeting-dialog';
import { cn } from '@/lib/utils';

interface MeetingCalendarProps {
  meetings: Meeting[];
  pairs?: Pair[];
  onMeetingClick?: (meeting: Meeting) => void;
  onDateClick?: (date: Date) => void;
  onMeetingUpdate?: (meeting: any) => void;
  onMeetingDelete?: (meetingId: string) => void;
  onMeetingCreate?: (meeting: any) => void;
  view?: 'month' | 'week';
  onViewChange?: (view: 'month' | 'week') => void;
  selectedParticipant?: string; // This is pairId
  onPairFilter?: (pairId: string) => void;
  showFilters?: boolean;
}

type ViewMode = 'month' | 'week';

export function MeetingCalendar({
  meetings = [],
  pairs = [],
  onMeetingClick,
  onDateClick,
  onMeetingUpdate,
  onMeetingDelete,
  onMeetingCreate,
  view: initialView = 'month',
  onViewChange,
  selectedParticipant: selectedPairId,
  onPairFilter,
  showFilters = false,
}: MeetingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    pair_id: ''
  });

  // Filter meetings based on selected pair
  const filteredMeetings = useMemo(() => {
    return (meetings || []).filter(meeting => {
      if (!selectedPairId || selectedPairId === 'all' || selectedPairId === '') return true;
      return meeting.pair_id === selectedPairId;
    });
  }, [meetings, selectedPairId]);

  const handleViewChange = (newView: ViewMode) => {
    setViewMode(newView);
    onViewChange?.(newView);
  };

  const handlePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (onDateClick) {
      onDateClick(date);
    } else {
      setFormData({
        title: '',
        notes: '',
        pair_id: (selectedPairId && selectedPairId !== 'all') ? selectedPairId : ''
      });
      setIsCreateDialogOpen(true);
    }
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setFormData({
      title: meeting.title,
      notes: meeting.notes || '',
      pair_id: meeting.pair_id
    });
    onMeetingClick?.(meeting);
  };

  const handleCreateMeeting = () => {
    if (!selectedDate || !formData.title || !formData.pair_id) {
      return;
    }

    const newMeeting: CreateMeetingInput = {
      pair_id: formData.pair_id,
      title: formData.title,
      notes: formData.notes,
      date_time: selectedDate.toISOString(),
    };

    onMeetingCreate?.(newMeeting);
    setIsCreateDialogOpen(false);
    setSelectedDate(null);
  };

  const handleUpdateMeeting = () => {
    if (!selectedMeeting) return;

    const updatedMeeting = {
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
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
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
                className={`min-h-[100px] p-2 border-r border-b cursor-pointer transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50/50 opacity-50' : 'bg-white'
                } ${isCurrentDay ? 'bg-primary/[0.03]' : ''} hover:bg-gray-50`}
                onClick={() => handleDateClick(day)}
              >
                <div className={`text-xs font-bold mb-1 ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'} ${isCurrentDay ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayMeetings.slice(0, 3).map((meeting, i) => (
                    <div
                      key={meeting.id}
                      className="text-[10px] p-1 bg-primary-light text-primary rounded-md truncate font-bold border border-primary/10 cursor-pointer hover:bg-primary hover:text-white transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMeetingClick(meeting);
                      }}
                    >
                      {format(new Date(meeting.date_time), 'HH:mm')} {meeting.title}
                    </div>
                  ))}
                  {dayMeetings.length > 3 && (
                    <div className="text-[9px] font-black text-gray-400 px-1">+{dayMeetings.length - 3} more</div>
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
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="grid grid-cols-8 gap-px border-b bg-gray-50">
          <div className="p-3 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center border-r">Time</div>
          {days.map(day => (
            <div key={day.toISOString()} className="p-2 text-center border-r last:border-r-0">
              <div className="text-[10px] font-black uppercase text-gray-400">{format(day, 'EEE')}</div>
              <div className={cn("text-lg font-black", isToday(day) ? 'text-primary' : 'text-gray-900')}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        <div className="divide-y max-h-[600px] overflow-y-auto kt-scrollable-y-hover">
          {Array.from({ length: 14 }, (_, i) => i + 8).map(hour => (
            <div key={hour} className="grid grid-cols-8 gap-px group">
              <div className="p-3 text-[10px] font-black text-gray-400 border-r bg-gray-50/30 text-center">
                {hour}:00
              </div>
              {days.map(day => {
                const hourDate = new Date(day);
                hourDate.setHours(hour, 0, 0, 0);
                const dayMeetings = getMeetingsForDate(day).filter(meeting => {
                  const mDate = new Date(meeting.date_time);
                  return mDate.getHours() === hour;
                });

                return (
                  <div key={day.toISOString()} className="p-1 border-r last:border-r-0 min-h-[60px] hover:bg-gray-50/50 transition-colors" onClick={() => handleDateClick(hourDate)}>
                    {dayMeetings.map(meeting => (
                      <div
                        key={meeting.id}
                        className="text-[10px] p-1.5 bg-primary-light text-primary rounded-lg border border-primary/10 cursor-pointer hover:shadow-md transition-all font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMeetingClick(meeting);
                        }}
                      >
                        <div className="truncate">{meeting.title}</div>
                        <div className="text-[9px] opacity-70 mt-0.5 font-medium">
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
      {/* View Selector & Date Navigation */}
      <Card className="shadow-none border-gray-200">
        <CardHeader className="py-4 px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
                <CalendarIcon size={20} />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-900 leading-none">
                  {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
                </CardTitle>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1.5">
                  {viewMode} View • {filteredMeetings.length} Scheduled
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {showFilters && pairs.length > 0 && (
                <Select value={selectedPairId || 'all'} onValueChange={onPairFilter}>
                  <SelectTrigger className="w-[220px] h-9 rounded-xl font-bold text-xs">
                    <SelectValue placeholder="Filter by pairing" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl">
                    <SelectItem value="all">All Program Meetings</SelectItem>
                    {pairs.map(pair => (
                      <SelectItem key={pair.id} value={pair.id}>
                        {pair.mentor?.full_name} ↔ {pair.mentee?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                <Button
                  variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn("h-7 px-3 rounded-lg text-[10px] font-black uppercase", viewMode === 'month' && "bg-white shadow-sm")}
                  onClick={() => handleViewChange('month')}
                >
                  Month
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn("h-7 px-3 rounded-lg text-[10px] font-black uppercase", viewMode === 'week' && "bg-white shadow-sm")}
                  onClick={() => handleViewChange('week')}
                >
                  Week
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="size-9 rounded-xl border-gray-200 hover:bg-gray-50" onClick={handlePrevious}>
                  <ChevronLeft size={16} />
                </Button>
                <Button variant="outline" size="icon" className="size-9 rounded-xl border-gray-200 hover:bg-gray-50" onClick={handleNext}>
                  <ChevronRight size={16} />
                </Button>
              </div>

              <Button size="sm" className="h-9 rounded-xl font-bold px-4 gap-2" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus size={16} />
                New Meeting
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Area */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {viewMode === 'month' ? renderMonthView() : renderWeekView()}
      </div>

      {/* Meeting Details Dialog */}
      <Dialog open={!!selectedMeeting} onOpenChange={(open) => !open && setSelectedMeeting(null)}>
        <DialogContent className="max-w-[450px] rounded-2xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Meeting Details</DialogTitle>
            <DialogDescription className="text-sm">View and manage the scheduled session</DialogDescription>
          </DialogHeader>
          {selectedMeeting && (
            <div className="space-y-5 py-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Meeting Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="rounded-xl border-gray-200 h-11 font-bold text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Notes / Agenda</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="rounded-xl border-gray-200 resize-none p-4 text-sm"
                />
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm"><Clock size={20} /></div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Scheduled for</p>
                  <p className="text-sm font-bold text-gray-900">{format(new Date(selectedMeeting.date_time), 'PPPP p')}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <div className="flex w-full justify-between">
              <Button variant="outline" onClick={() => setSelectedMeeting(null)} className="rounded-xl h-11 px-6 font-bold">Cancel</Button>
              <div className="flex gap-2">
                <Button variant="outline" className="size-11 rounded-xl border-red-100 bg-red-50 text-red-600 hover:bg-red-100 p-0" onClick={handleDeleteMeeting} title="Delete Meeting">
                  <Trash2 size={18} />
                </Button>
                <Button onClick={handleUpdateMeeting} className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20">Save Changes</Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Meeting Dialog */}
      <MeetingDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        pairId={formData.pair_id || (pairs.length === 1 ? pairs[0].id : '')}
        onSubmit={async (data) => {
          onMeetingCreate?.(data);
          setIsCreateDialogOpen(false);
        }}
      />
    </div>
  );
}
