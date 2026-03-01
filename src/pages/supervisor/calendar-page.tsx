import { Fragment, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useAllMeetings } from '@/hooks/use-meetings';
import { useAllPairs } from '@/hooks/use-pairs';
import { useQueryClient } from '@tanstack/react-query';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { MeetingCalendar } from '@/components/calendar/meeting-calendar';
import { UpcomingMeetingsList } from './components/upcoming-meetings-list';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { KeenIcon } from '@/components/keenicons';
import type { Meeting, CreateMeetingInput } from '@/lib/api/meetings';

export function SupervisorCalendarPage() {
  const { user } = useAuth();
  const { meetings = [], stats, isLoading, createMeeting, updateMeeting, deleteMeeting } = useAllMeetings();
  const { data: pairs = [] } = useAllPairs();
  const queryClient = useQueryClient();
  const [selectedPairId, setSelectedPairId] = useState<string>('');

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['meetings'] });
    toast.success('Calendar data refreshed');
  };

  const handleMeetingCreate = async (meetingData: any) => {
    try {
      await createMeeting(meetingData);
      toast.success('Meeting created successfully');
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to create meeting');
    }
  };

  const handleMeetingUpdate = async (meeting: any) => {
    try {
      await updateMeeting(meeting.id, {
        title: meeting.title,
        notes: meeting.notes || '',
      });
      toast.success('Meeting updated successfully');
    } catch (error) {
      console.error('Error updating meeting:', error);
      toast.error('Failed to update meeting');
    }
  };

  const handleMeetingDelete = async (meetingId: string) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await deleteMeeting(meetingId);
      toast.success('Meeting deleted successfully');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    }
  };

  const handlePairFilter = (pairId: string) => {
    setSelectedPairId(pairId);
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Program Calendar"
            description="View and manage all meetings across all mentor-mentee pairs"
          />
          <ToolbarActions>
            <div className="flex items-center gap-3">
              {stats && (
                <div className="hidden md:flex items-center gap-4 mr-4 border-r border-gray-200 pr-6">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase text-gray-400 leading-none">Upcoming</span>
                    <span className="text-sm font-bold text-primary leading-tight">{stats.upcoming}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase text-gray-400 leading-none">Completed</span>
                    <span className="text-sm font-bold text-success leading-tight">{stats.completed}</span>
                  </div>
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
                className="rounded-xl font-bold text-xs h-9 gap-2"
              >
                <KeenIcon icon="arrows-circle" className={cn(isLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          <UpcomingMeetingsList meetings={meetings} isLoading={isLoading} />
          
          <MeetingCalendar
            meetings={meetings}
            pairs={pairs}
            onMeetingCreate={handleMeetingCreate}
            onMeetingUpdate={handleMeetingUpdate}
            onMeetingDelete={handleMeetingDelete}
            selectedParticipant={selectedPairId}
            onPairFilter={handlePairFilter}
            showFilters={true}
          />
        </div>
      </Container>
    </Fragment>
  );
}

