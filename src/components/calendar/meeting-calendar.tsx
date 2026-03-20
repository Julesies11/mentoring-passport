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
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMeetingStatus, type Meeting } from '@/lib/api/meetings';
import type { Pair } from '@/lib/api/pairs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';
import { MeetingDialog } from '../meetings/meeting-dialog';

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
  readOnly?: boolean;
}

type ViewMode = 'month' | 'week';

export function MeetingCalendar({
  meetings,
  pairs,
  onMeetingDelete,
  onMeetingUpdate,
  onMeetingCreate,
  onMeetingClick,
  view: initialView = 'month',
  selectedParticipant,
  showFilters = true,
  onPairFilter,
  showAddButton = true,
  readOnly = false
}: MeetingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const startDate = useMemo(() => {
    if (viewMode === 'month') {
      return startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    }
    return startOfWeek(currentDate, { weekStartsOn: 1 });
  }, [currentDate, viewMode]);

  const endDate = useMemo(() => {
    if (viewMode === 'month') {
      return endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    }
    return endOfWeek(currentDate, { weekStartsOn: 1 });
  }, [currentDate, viewMode]);

  const filteredMeetings = useMemo(() => {
    return selectedParticipant && selectedParticipant !== 'all'
      ? meetings.filter(meeting => meeting.pair_id === selectedParticipant)
      : meetings;
  }, [meetings, selectedParticipant]);

  const getCalendarDays = () => {
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
    if (readOnly) return;
    setSelectedDate(day);
    setSelectedMeeting(null);
    setIsDialogOpen(true);
  };

  const handleMeetingClick = (meeting: Meeting) => {
    if (onMeetingClick) {
      onMeetingClick(meeting);
    } else {
      setSelectedMeeting(meeting);
      setSelectedDate(null);
      setIsDialogOpen(true);
    }
  };

  const handleMeetingSubmit = async (data: any) => {
    if (selectedMeeting) {
      await onMeetingUpdate?.({ ...data, id: selectedMeeting.id });
    } else {
      await onMeetingCreate?.(data);
    }
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/* Calendar Control Header */}
      <Card className="border-none shadow-sm bg-white">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-8 py-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-black text-gray-900 leading-tight">
              {viewMode === 'month' 
                ? format(currentDate, 'MMMM yyyy')
                : `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
              }
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-none font-bold text-[10px] uppercase px-2 h-5">
                {filteredMeetings.length} Meetings Found
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
            
            {showAddButton && !readOnly && (
              <Button onClick={() => {
                setSelectedMeeting(null);
                setSelectedDate(null);
                setIsDialogOpen(true);
              }} className="h-10 rounded-xl font-bold gap-2 px-5 shadow-lg shadow-primary/20">
                <Plus size={18} className="stroke-[3]" />
                New Meeting
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card className="border-none shadow-sm overflow-hidden border-0 sm:border">
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
            {getCalendarDays().map((day, index) => {
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
                          getMeetingStatus(meeting.date_time) === 'past' ? "bg-success" : "bg-primary"
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

      {/* Universal Meeting Hub Dialog */}
      <MeetingDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        meeting={selectedMeeting}
        initialDate={selectedDate ? format(selectedDate, "yyyy-MM-dd'T'09:00") : null}
        pairId={selectedParticipant && selectedParticipant !== 'all' ? selectedParticipant : (pairs.length === 1 ? pairs[0].id : '')}
        onSubmit={handleMeetingSubmit}
        onDelete={onMeetingDelete}
      />
    </div>
  );
}
