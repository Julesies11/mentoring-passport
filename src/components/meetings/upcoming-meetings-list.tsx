import { format, isFuture } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';
import type { Meeting } from '@/lib/api/meetings';

interface UpcomingMeetingsListProps {
  meetings: Meeting[];
  isLoading: boolean;
  onMeetingClick?: (meeting: Meeting) => void;
}

export function UpcomingMeetingsList({ meetings, isLoading, onMeetingClick }: UpcomingMeetingsListProps) {
  const upcomingMeetings = meetings
    .filter(m => isFuture(new Date(m.date_time)))
    .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
    .slice(0, 4);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse border-gray-100 shadow-none bg-gray-50/50">
            <CardContent className="h-32" />
          </Card>
        ))}
      </div>
    );
  }

  if (upcomingMeetings.length === 0) {
    return (
      <Card className="mb-8 border-dashed border-2 border-gray-100 shadow-none bg-gray-50/20">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="size-10 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
            <CalendarIcon size={18} className="text-gray-300" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No upcoming meetings scheduled</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
          <CalendarIcon size={14} className="text-primary" />
          Upcoming Meetings
        </h3>
        <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/5 border-primary/10">
          Next {upcomingMeetings.length} Sessions
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {upcomingMeetings.map(meeting => (
          <Card 
            key={meeting.id} 
            className="border-none shadow-sm bg-white hover:shadow-md transition-all cursor-pointer active:scale-95 group overflow-hidden"
            onClick={() => onMeetingClick?.(meeting)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">
                    {format(new Date(meeting.date_time), 'EEE, MMM d')}
                  </span>
                  <span className="text-lg font-black text-gray-900 mt-1">
                    {format(new Date(meeting.date_time), 'HH:mm')}
                  </span>
                </div>
                <div className="size-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Clock size={16} />
                </div>
              </div>

              <h4 className="font-bold text-sm text-gray-800 truncate mb-4" title={meeting.task?.name || meeting.title}>
                {meeting.task?.name || meeting.title}
              </h4>

              <div className="flex items-center -space-x-2 mb-1">
                <Avatar className="size-7 border-2 border-white shadow-sm">
                  <AvatarImage src={getAvatarPublicUrl(meeting.mp_pairs?.mentor?.avatar_url, meeting.mp_pairs?.mentor?.id)} />
                  <AvatarFallback className="text-[8px] font-bold bg-blue-50 text-blue-600">
                    {getInitials(meeting.mp_pairs?.mentor?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <Avatar className="size-7 border-2 border-white shadow-sm">
                  <AvatarImage src={getAvatarPublicUrl(meeting.mp_pairs?.mentee?.avatar_url, meeting.mp_pairs?.mentee?.id)} />
                  <AvatarFallback className="text-[8px] font-bold bg-green-50 text-green-600">
                    {getInitials(meeting.mp_pairs?.mentee?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="pl-4 text-[10px] font-bold text-gray-500 truncate">
                  {meeting.mp_pairs?.mentor?.full_name?.split(' ')[0]} & {meeting.mp_pairs?.mentee?.full_name?.split(' ')[0]}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
