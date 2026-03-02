import { useState, useMemo } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useAllMeetings } from '@/hooks/use-meetings';
import { useAllPairs } from '@/hooks/use-pairs';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { MeetingCalendar } from '@/components/calendar/meeting-calendar';
import { UpcomingMeetingsList } from './components/upcoming-meetings-list';
import { SearchInput } from '@/components/common/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { CreateMeetingInput } from '@/lib/api/meetings';

export function SupervisorCalendarPage() {
  const { user } = useAuth();
  const { meetings = [], stats, isLoading, createMeeting, updateMeeting, deleteMeeting } = useAllMeetings();
  const { data: pairs = [] } = useAllPairs();
  const [selectedPairId, setSelectedPairId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Log user role for debugging if needed, but remove from component state to avoid unused var
  if (user) {
    // user is available if needed
  }

  const handlePairFilter = (pairId: string) => {
    setSelectedPairId(pairId);
  };

  const handleMeetingCreate = async (data: CreateMeetingInput) => {
    try {
      await createMeeting(data);
      toast.success('Meeting scheduled successfully');
    } catch (err) {
      console.error('Error creating meeting:', err);
      toast.error('Failed to schedule meeting');
    }
  };

  const handleMeetingUpdate = async (meeting: any) => {
    try {
      const { id, ...updates } = meeting;
      await updateMeeting(id, updates);
      toast.success('Meeting updated successfully');
    } catch (err) {
      console.error('Error updating meeting:', err);
      toast.error('Failed to update meeting');
    }
  };

  const handleMeetingDelete = async (meetingId: string) => {
    try {
      await deleteMeeting(meetingId);
      toast.success('Meeting deleted successfully');
    } catch (err) {
      console.error('Error deleting meeting:', err);
      toast.error('Failed to delete meeting');
    }
  };

  // Filter meetings based on pair selection and search query
  const filteredMeetings = useMemo(() => {
    return meetings.filter(meeting => {
      // 1. Filter by Pair
      const matchesPair = !selectedPairId || selectedPairId === 'all' || meeting.pair_id === selectedPairId;
      
      // 2. Filter by Search Query (Task Name, Title, or Participant Names)
      const searchTerm = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        meeting.title.toLowerCase().includes(searchTerm) ||
        (meeting.task?.name && meeting.task.name.toLowerCase().includes(searchTerm)) ||
        meeting.mp_pairs?.mentor?.full_name?.toLowerCase().includes(searchTerm) ||
        meeting.mp_pairs?.mentee?.full_name?.toLowerCase().includes(searchTerm);

      return matchesPair && matchesSearch;
    });
  }, [meetings, selectedPairId, searchQuery]);

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Program Calendar"
            description="View and manage all meetings across all mentor-mentee pairs"
          />
          <ToolbarActions>
            <SearchInput
              placeholder="Search meetings or tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              containerClassName="w-[180px] lg:w-[220px]"
              className="h-9"
            />

            {pairs.length > 0 && (
              <Select value={selectedPairId || 'all'} onValueChange={handlePairFilter}>
                <SelectTrigger className="w-[180px] lg:w-[220px] h-9 rounded-xl font-bold text-xs">
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

            {stats && (
              <div className="hidden lg:flex items-center gap-4 border-l border-gray-200 px-6 mx-2">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black uppercase text-gray-400 leading-none mb-1">Upcoming</span>
                  <span className="text-xs font-black text-primary leading-tight">{stats.upcoming}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black uppercase text-gray-400 leading-none mb-1">Completed</span>
                  <span className="text-xs font-black text-success leading-tight">{stats.completed}</span>
                </div>
              </div>
            )}
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          <UpcomingMeetingsList meetings={filteredMeetings} isLoading={isLoading} />
          
          <MeetingCalendar
            meetings={filteredMeetings}
            pairs={pairs}
            onMeetingCreate={handleMeetingCreate}
            onMeetingUpdate={handleMeetingUpdate}
            onMeetingDelete={handleMeetingDelete}
            selectedParticipant={selectedPairId}
            onPairFilter={handlePairFilter}
            showFilters={false}
          />
        </div>
      </Container>
    </>
  );
}
