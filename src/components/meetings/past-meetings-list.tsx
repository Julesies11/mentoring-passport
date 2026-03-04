import { format, isFuture } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons';
import type { Meeting } from '@/lib/api/meetings';

interface PastMeetingsListProps {
  meetings: Meeting[];
  isLoading: boolean;
  onMeetingClick?: (meeting: Meeting) => void;
}

export function PastMeetingsList({ meetings, isLoading, onMeetingClick }: PastMeetingsListProps) {
  const pastMeetings = meetings
    .filter(m => !isFuture(new Date(m.date_time)))
    .sort((a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime())
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse border-gray-100 shadow-none bg-gray-50/50">
            <CardContent className="h-32" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">Past</h3>
        <div className="h-px bg-gray-100 flex-1 ml-4" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-5">
        {pastMeetings.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3 border-dashed border-2 border-gray-100 bg-gray-50/30 border-0 sm:border shadow-none">
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground font-medium">No past meetings recorded.</p>
            </CardContent>
          </Card>
        ) : (
          pastMeetings.map((meeting) => (
            <Card 
              key={meeting.id} 
              className="opacity-80 hover:opacity-100 transition-all cursor-pointer border-0 sm:border shadow-none sm:shadow-sm bg-gray-50/30 group"
              onClick={() => onMeetingClick?.(meeting)}
            >
              <CardHeader className="pb-3 border-b border-gray-100 mb-4 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grayscale group-hover:grayscale-0 transition-all">
                    <KeenIcon icon="calendar" className="text-gray-400" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <CardTitle className="text-sm sm:text-base font-bold text-gray-500 leading-tight group-hover:text-gray-900 transition-colors">
                      {meeting.task?.name || meeting.title}
                    </CardTitle>
                    <Badge variant="outline" className="bg-gray-100 text-gray-500 border-none text-[9px] sm:text-[10px] uppercase font-bold w-fit mt-1">
                      Past
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-500 font-medium">
                    <KeenIcon icon="calendar" className="text-muted-foreground text-base sm:text-lg" />
                    {format(new Date(meeting.date_time), 'PPP')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
