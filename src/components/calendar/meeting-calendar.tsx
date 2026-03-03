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
  isToday 
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, Trash2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Meeting } from '@/lib/api/meetings';
import type { Pair } from '@/lib/api/pairs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';
import { MeetingDialog } from '../meetings/meeting-dialog';
import { KeenIcon } from '@/components/keenicons';

interface MeetingCalendarProps {
  meetings: Meeting[];
  pairs: Pair[];
  onMeetingClick?: (meeting: Meeting) => void;
  onDateClick?: (date: Date) => void;
  onMeetingUpdate?: (meeting: any) => void;
  onMeetingDelete?: (meetingId: string) => void;
  onMeetingCreate?: (meeting: any) => void;
  view?: 'month' | 'week';
  onViewChange?: (view: 'month' | 'week') => void;
  selectedParticipant?: string;
  onPairFilter?: (pairId: string) => void;
  showFilters?: boolean;
  showAddButton?: boolean;
}

type ViewMode = 'month' | 'week';

export function MeetingCalendar({
  meetings,
  pairs,
  onMeetingDelete,
  onMeetingUpdate,
  onMeetingCreate,
  view: initialView = 'month',
  selectedParticipant,
  showFilters = true,
  onPairFilter,
  showAddButton = true
}: MeetingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpened] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Form State for creating/editing
  const [formData, setFormData] = useState({
    title: '',
    date_time: '',
    notes: '',
    pair_id: selectedParticipant === 'all' ? '' : (selectedParticipant || ''),
    location: '',
    meeting_type: 'virtual' as 'in_person' | 'virtual' | 'phone',
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const filteredMeetings = useMemo(() => {
    return selectedParticipant && selectedParticipant !== 'all'
      ? meetings.filter(meeting => meeting.pair_id === selectedParticipant)
      : meetings;
  }, [meetings, selectedParticipant]);

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
      // Using year, month, day to compare
      return meetingDate.getDate() === day.getDate() &&
             meetingDate.getMonth() === day.getMonth() &&
             meetingDate.getFullYear() === day.getFullYear();
    });
  };

  const handlePrevious = () => {
    setCurrentDate(prev => viewMode === 'month' ? subMonths(prev, 1) : subWeeks(prev, 1));
  };

  const handleNext = () => {
    setCurrentDate(prev => viewMode === 'month' ? addMonths(prev, 1) : addWeeks(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setFormData({
      ...formData,
      date_time: format(day, "yyyy-MM-dd'T'09:00"),
      title: '',
      notes: '',
      location: '',
      meeting_type: 'virtual'
    });
    setIsCreateDialogOpen(true);
  };

  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsDetailsDialogOpen(true);
  };

  const handleEditMeeting = () => {
    if (!selectedMeeting) return;
    setIsDetailsDialogOpen(false);
    setIsEditDialogOpened(true);
  };

  const handleMeetingSubmit = async (data: any) => {
    if (isEditDialogOpen && selectedMeeting) {
      await onMeetingUpdate?.({ ...data, id: selectedMeeting.id });
      setIsEditDialogOpened(false);
    } else {
      await onMeetingCreate?.(data);
      setIsCreateDialogOpen(false);
    }
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/* Calendar Control Header */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-8 py-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-black text-gray-900 leading-tight">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-none font-bold text-[10px] uppercase px-2 h-5">
                {filteredMeetings.length} Sessions Found
              </Badge>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl p-1 gap-1 mr-2">
              <Button variant="ghost" size="sm" onClick={handlePrevious} className="h-8 w-8 p-0 rounded-lg hover:bg-white hover:shadow-sm">
                <ChevronLeft size={16} />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToday} className="h-8 px-3 rounded-lg hover:bg-white hover:shadow-sm text-[10px] font-black uppercase tracking-widest">
                Today
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNext} className="h-8 w-8 p-0 rounded-lg hover:bg-white hover:shadow-sm">
                <ChevronRight size={16} />
              </Button>
            </div>
            
            {showFilters && (
              <div className="flex items-center gap-2 mr-2">
                <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                  <SelectTrigger className="w-28 h-10 rounded-xl font-bold text-xs uppercase bg-gray-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-xl border-gray-100">
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                  </SelectContent>
                </Select>

                {onPairFilter && pairs.length > 0 && (
                  <Select value={selectedParticipant || 'all'} onValueChange={onPairFilter}>
                    <SelectTrigger className="w-48 h-10 rounded-xl font-bold text-xs uppercase bg-gray-50">
                      <SelectValue placeholder="All Relationships" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl border-gray-100 max-w-[300px]">
                      <SelectItem value="all">All Relationships</SelectItem>
                      {pairs.map(pair => (
                        <SelectItem key={pair.id} value={pair.id}>
                          {pair.mentor?.full_name} ↔ {pair.mentee?.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            
            {showAddButton && (
              <Button onClick={() => setIsCreateDialogOpen(true)} className="h-10 rounded-xl font-bold gap-2 px-5 shadow-lg shadow-primary/20">
                <Plus size={18} className="stroke-[3]" />
                New Meeting
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card className="border-none shadow-sm overflow-hidden">
        <div className="p-0 border-b border-gray-100">
          <div className="grid grid-cols-7 bg-gray-50/50">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-[10px] font-black uppercase text-gray-400 text-center py-4 tracking-[0.2em]">
                {day}
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-0">
          <div className="grid grid-cols-7 border-l border-t border-gray-100">
            {getDaysInMonth().map((day, index) => {
              const dayMeetings = getMeetingsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              
              return (
                <div
                  key={index}
                  className={cn(
                    'min-h-[140px] p-3 border-r border-b border-gray-100 transition-all cursor-pointer group flex flex-col gap-2',
                    !isCurrentMonth ? 'bg-gray-50/30 grayscale-[0.5]' : 'bg-white',
                    isTodayDate && 'bg-primary/[0.02]',
                    selectedDate && day.getTime() === selectedDate.getTime() && 'bg-primary/[0.04]'
                  )}
                  onClick={() => handleDayClick(day)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      'size-7 flex items-center justify-center text-xs font-black rounded-full transition-colors',
                      isTodayDate ? 'bg-primary text-white shadow-lg shadow-primary/30' : 
                      isCurrentMonth ? 'text-gray-900 group-hover:bg-gray-100' : 'text-gray-300'
                    )}>
                      {format(day, 'd')}
                    </span>
                    {dayMeetings.length > 0 && (
                      <span className="text-[9px] font-black text-primary/40 uppercase tracking-tighter">
                        {dayMeetings.length} {dayMeetings.length === 1 ? 'Session' : 'Sessions'}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 flex-1">
                    {dayMeetings.slice(0, 3).map((meeting) => (
                      <div
                        key={meeting.id}
                        className="group/item relative text-[10px] p-2 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden active:scale-95"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMeetingClick(meeting);
                        }}
                      >
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-1",
                          meeting.status === 'completed' ? "bg-success" : 
                          meeting.status === 'cancelled' ? "bg-danger" : "bg-primary"
                        )} />
                        
                        <div className="flex flex-col gap-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate leading-tight pr-1">
                            {meeting.task?.name || meeting.title}
                          </p>
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="text-gray-400 font-bold tracking-tighter uppercase tabular-nums">
                              {format(new Date(meeting.date_time), 'p')}
                            </span>
                            
                            <div className="flex -space-x-1.5">
                              <div className="size-4 rounded-full border border-white bg-gray-50 overflow-hidden ring-1 ring-gray-100">
                                <Avatar className="size-full">
                                  <AvatarImage src={getAvatarPublicUrl(meeting.mp_pairs?.mentor?.avatar_url, meeting.mp_pairs?.mentor?.id)} />
                                  <AvatarFallback className="text-[6px] font-bold bg-blue-50 text-blue-600">{getInitials(meeting.mp_pairs?.mentor?.full_name)}</AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="size-4 rounded-full border border-white bg-gray-50 overflow-hidden ring-1 ring-gray-100">
                                <Avatar className="size-full">
                                  <AvatarImage src={getAvatarPublicUrl(meeting.mp_pairs?.mentee?.avatar_url, meeting.mp_pairs?.mentee?.id)} />
                                  <AvatarFallback className="text-[6px] font-bold bg-green-50 text-green-600">{getInitials(meeting.mp_pairs?.mentee?.full_name)}</AvatarFallback>
                                </Avatar>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {dayMeetings.length > 3 && (
                      <div className="text-[9px] font-black text-gray-400 text-center pt-1 uppercase tracking-widest bg-gray-50/50 rounded-lg py-1">
                        + {dayMeetings.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Selected Date Drawer/Card (Future Improvement) */}

      {/* Meeting Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent 
          className="max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl"
          aria-describedby={undefined}
        >
          {selectedMeeting && (
            <div className="flex flex-col">
              {/* Header with gradient based on status */}
              <div className={cn(
                "p-8 pt-10 text-white relative overflow-hidden",
                selectedMeeting.status === 'completed' ? "bg-success" : 
                selectedMeeting.status === 'cancelled' ? "bg-danger" : "bg-primary"
              )}>
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-white/20 text-white border-none font-black uppercase text-[10px] tracking-widest px-3 h-6">
                      {selectedMeeting.status}
                    </Badge>
                    <div className="flex items-center gap-1 opacity-80 text-[10px] font-black uppercase tracking-tighter">
                      <Clock size={12} className="mr-1" />
                      Scheduled
                    </div>
                  </div>
                  <DialogTitle className="text-2xl font-black leading-tight tracking-tight">
                    {selectedMeeting.task?.name || selectedMeeting.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Meeting details for {selectedMeeting.task?.name || selectedMeeting.title}
                  </DialogDescription>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute top-[-20%] right-[-10%] opacity-10 rotate-12">
                  <CalendarIcon size={200} />
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Participants Section */}
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] px-1">Participants</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <Avatar className="size-10 border-2 border-white shadow-sm">
                        <AvatarImage src={getAvatarPublicUrl(selectedMeeting.mp_pairs?.mentor?.avatar_url, selectedMeeting.mp_pairs?.mentor?.id)} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">{getInitials(selectedMeeting.mp_pairs?.mentor?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] font-black uppercase text-blue-600 leading-none mb-1">Mentor</span>
                        <span className="text-xs font-bold text-gray-900 truncate">{selectedMeeting.mp_pairs?.mentor?.full_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                      <Avatar className="size-10 border-2 border-white shadow-sm">
                        <AvatarImage src={getAvatarPublicUrl(selectedMeeting.mp_pairs?.mentee?.avatar_url, selectedMeeting.mp_pairs?.mentee?.id)} />
                        <AvatarFallback className="bg-green-100 text-green-700 font-bold">{getInitials(selectedMeeting.mp_pairs?.mentee?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] font-black uppercase text-green-600 leading-none mb-1">Mentee</span>
                        <span className="text-xs font-bold text-gray-900 truncate">{selectedMeeting.mp_pairs?.mentee?.full_name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                <div className="space-y-5">
                  <div className="flex items-center gap-4 group">
                    <div className="size-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                      <CalendarIcon size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">Date</span>
                      <span className="text-sm font-bold text-gray-800">{format(new Date(selectedMeeting.date_time), 'EEEE, MMMM do')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group">
                    <div className="size-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                      <Clock size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">Time</span>
                      <span className="text-sm font-bold text-gray-800">{format(new Date(selectedMeeting.date_time), 'p')}</span>
                    </div>
                  </div>

                  {selectedMeeting.notes && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 px-1 text-gray-400">
                        <FileText size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Notes / Agenda</span>
                      </div>
                      <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 text-sm text-gray-700 italic leading-relaxed">
                        "{selectedMeeting.notes}"
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 flex items-center gap-3">
                  <Button onClick={handleEditMeeting} className="flex-1 h-12 rounded-xl font-bold gap-2 shadow-lg shadow-primary/10">
                    <KeenIcon icon="pencil" className="text-primary-foreground/50" />
                    Update Details
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    mode="icon" 
                    className="h-12 w-12 rounded-xl text-gray-300 hover:text-danger hover:bg-danger/5 transition-colors"
                    onClick={() => {
                      if (confirm('Permanently delete this meeting?')) {
                        onMeetingDelete?.(selectedMeeting.id);
                        setIsDetailsDialogOpen(false);
                      }
                    }}
                  >
                    <Trash2 size={20} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog (Uses robust MeetingDialog component) */}
      <MeetingDialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpened(false);
          }
        }}
        meeting={isEditDialogOpen ? selectedMeeting : null}
        pairId={formData.pair_id || (pairs.length === 1 ? pairs[0].id : '')}
        onSubmit={handleMeetingSubmit}
      />
    </div>
  );
}
