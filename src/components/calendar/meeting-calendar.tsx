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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Edit, Trash2, User, FileText } from 'lucide-react';
import type { Meeting, CreateMeetingInput } from '@/lib/api/meetings';
import type { Pair } from '@/lib/api/pairs';
import { MeetingDialog } from '@/components/meetings/meeting-dialog';
import { cn } from '@/lib/utils';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';
import { KeenIcon } from '@/components/keenicons';

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
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredMeetings.filter(meeting => {
      try {
        return format(new Date(meeting.date_time), 'yyyy-MM-dd') === dateStr;
      } catch (e) {
        return false;
      }
    });
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
                className={`min-h-[120px] p-2 border-r border-b cursor-pointer transition-colors ${
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
                      className="text-[10px] p-1.5 bg-white border border-gray-100 rounded-lg shadow-sm hover:border-primary/30 transition-all group overflow-hidden"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMeetingClick(meeting);
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="flex -space-x-1.5 shrink-0">
                          <Avatar className="size-4 border border-white">
                            <AvatarImage src={getAvatarPublicUrl(meeting.mp_pairs?.mentor?.avatar_url, meeting.mp_pairs?.mentor?.id)} />
                            <AvatarFallback className="text-[6px] font-bold bg-blue-50 text-blue-600">{getInitials(meeting.mp_pairs?.mentor?.full_name)}</AvatarFallback>
                          </Avatar>
                          <Avatar className="size-4 border border-white">
                            <AvatarImage src={getAvatarPublicUrl(meeting.mp_pairs?.mentee?.avatar_url, meeting.mp_pairs?.mentee?.id)} />
                            <AvatarFallback className="text-[6px] font-bold bg-green-50 text-green-600">{getInitials(meeting.mp_pairs?.mentee?.full_name)}</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="font-bold text-gray-900 truncate flex-1">
                      {meeting.task?.name || meeting.title}
                    </div>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-gray-400 font-medium">
                        <Clock size={8} />
                        {format(new Date(meeting.date_time), 'HH:mm')}
                      </div>
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
                        className="text-[10px] p-2 bg-white border border-gray-100 rounded-xl shadow-sm cursor-pointer hover:border-primary/30 transition-all font-bold group"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMeetingClick(meeting);
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="flex -space-x-1.5">
                            <Avatar className="size-4 border border-white">
                              <AvatarImage src={getAvatarPublicUrl(meeting.mp_pairs?.mentor?.avatar_url, meeting.mp_pairs?.mentor?.id)} />
                              <AvatarFallback className="text-[6px] font-bold bg-blue-50 text-blue-600">{getInitials(meeting.mp_pairs?.mentor?.full_name)}</AvatarFallback>
                            </Avatar>
                            <Avatar className="size-4 border border-white">
                              <AvatarImage src={getAvatarPublicUrl(meeting.mp_pairs?.mentee?.avatar_url, meeting.mp_pairs?.mentee?.id)} />
                              <AvatarFallback className="text-[6px] font-bold bg-green-50 text-green-600">{getInitials(meeting.mp_pairs?.mentee?.full_name)}</AvatarFallback>
                            </Avatar>
                          </div>
                          <span className="text-[9px] text-gray-400 group-hover:text-primary transition-colors">{format(new Date(meeting.date_time), 'HH:mm')}</span>
                        </div>
                        <div className="truncate text-gray-900 leading-tight">
                          {meeting.task?.name || meeting.title}
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
                <Button variant="outline" size="icon" className="size-9 rounded-xl border-gray-200 hover:bg-50" onClick={handlePrevious}>
                  <ChevronLeft size={16} />
                </Button>
                <Button variant="outline" size="icon" className="size-9 rounded-xl border-gray-200 hover:bg-50" onClick={handleNext}>
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
        <DialogContent className="max-w-[500px] max-h-[95vh] rounded-2xl border-none shadow-2xl p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-8 pt-8 pb-4 border-b border-gray-50 shrink-0">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">Meeting Details</DialogTitle>
                <DialogDescription className="text-xs font-bold text-gray-400 uppercase tracking-widest">Session Management</DialogDescription>
              </div>
              <Badge className={cn("rounded-full font-black uppercase text-[10px] px-3 h-6", 
                selectedMeeting?.status === 'upcoming' ? 'bg-primary/10 text-primary border-none' : 'bg-success/10 text-success border-none'
              )}>
                {selectedMeeting?.status}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto kt-scrollable-y-hover p-8 space-y-6">
            {selectedMeeting && (
              <Fragment>
                {/* Meeting Participants Section */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1 flex items-center gap-2">
                    <User size={12} className="text-primary" />
                    Program Participants
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <Avatar className="size-10 border-2 border-white shadow-sm">
                        <AvatarImage src={getAvatarPublicUrl(selectedMeeting.mp_pairs?.mentor?.avatar_url, selectedMeeting.mp_pairs?.mentor?.id)} />
                        <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">{getInitials(selectedMeeting.mp_pairs?.mentor?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-tighter leading-none mb-1">Mentor</p>
                        <p className="text-sm font-bold text-gray-900 truncate leading-none">{selectedMeeting.mp_pairs?.mentor?.full_name || 'Assigned'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <Avatar className="size-10 border-2 border-white shadow-sm">
                        <AvatarImage src={getAvatarPublicUrl(selectedMeeting.mp_pairs?.mentee?.avatar_url, selectedMeeting.mp_pairs?.mentee?.id)} />
                        <AvatarFallback className="bg-green-50 text-green-600 font-bold">{getInitials(selectedMeeting.mp_pairs?.mentee?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-green-500 uppercase tracking-tighter leading-none mb-1">Mentee</p>
                        <p className="text-sm font-bold text-gray-900 truncate leading-none">{selectedMeeting.mp_pairs?.mentee?.full_name || 'Assigned'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Basic Info Section */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Session Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="rounded-xl border-gray-200 h-12 font-bold text-gray-900 shadow-sm focus:ring-primary/20"
                    />
                  </div>

                  <div className="p-4 bg-primary/[0.03] rounded-2xl border border-primary/10 flex items-center gap-4">
                    <div className="size-12 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border border-primary/5"><Clock size={24} /></div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest leading-none mb-1">Scheduled for</p>
                      <p className="text-base font-black text-gray-900 leading-tight">
                        {format(new Date(selectedMeeting.date_time), 'EEEE, MMMM do')}
                      </p>
                      <p className="text-sm font-bold text-gray-500">
                        at {format(new Date(selectedMeeting.date_time), 'p')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Linked Task Section */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1 flex items-center gap-2">
                    <FileText size={12} className="text-gray-400" />
                    Associated Checklist Task
                  </Label>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-white flex items-center justify-center text-gray-400 shadow-sm border border-gray-100"><KeenIcon icon="check-square" className="text-sm" /></div>
                      <span className="text-sm font-bold text-gray-700">
                        {selectedMeeting.task?.name || 'General Program Sync'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1">Notes / Agenda</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="What will be discussed during this session?"
                    className="rounded-2xl border-gray-200 resize-none p-4 text-sm bg-white shadow-sm focus:ring-primary/20"
                  />
                </div>
              </Fragment>
            )}
          </div>
          
          <DialogFooter className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 shrink-0">
            <div className="flex w-full justify-between items-center">
              <Button variant="outline" onClick={() => setSelectedMeeting(null)} className="rounded-xl h-11 px-6 font-bold text-xs">Cancel</Button>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="size-11 rounded-xl border-red-100 bg-white text-red-600 hover:bg-red-50 p-0 shadow-sm" 
                  onClick={handleDeleteMeeting} 
                  title="Delete Meeting"
                >
                  <Trash2 size={18} />
                </Button>
                <Button onClick={handleUpdateMeeting} className="rounded-xl h-11 px-8 font-bold text-xs shadow-lg shadow-primary/20">
                  Update Session
                </Button>
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
