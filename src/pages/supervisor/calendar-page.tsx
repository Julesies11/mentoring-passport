import { useState, useMemo } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useOrganisation } from '@/providers/organisation-provider';
import { useAllMeetings } from '@/hooks/use-meetings';
import { useAllPairs } from '@/hooks/use-pairs';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { MeetingCalendar } from '@/components/calendar/meeting-calendar';
import { UpcomingMeetingsList } from '@/components/meetings/upcoming-meetings-list';
import { SearchInput } from '@/components/common/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MeetingDialog } from '@/components/meetings/meeting-dialog';
import { getMeetingStatus, type Meeting } from '@/lib/api/meetings';
import { ProgramSelector } from '@/components/common/program-selector';
import { KeenIcon } from '@/components/keenicons';
import { Card, CardContent } from '@/components/ui/card';

export function SupervisorCalendarPage() {
  const { isOrgAdmin } = useAuth();
  const { activeProgram, isLoading: isContextLoading } = useOrganisation();
  const { meetings = [], isLoading, createMeeting, updateMeeting, deleteMeeting } = useAllMeetings();
  const { data: pairs = [] } = useAllPairs();
  const [selectedPairId, setSelectedPairId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate stats on the fly
  const stats = useMemo(() => {
    return {
      upcoming: meetings.filter(m => getMeetingStatus(m.date_time) === 'upcoming').length,
      past: meetings.filter(m => getMeetingStatus(m.date_time) === 'past').length,
    };
  }, [meetings]);

  // Unified Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const handlePairFilter = (pairId: string) => {
    setSelectedPairId(pairId);
  };

  const handleCreateNew = () => {
    setSelectedMeeting(null);
    setIsDialogOpen(true);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsDialogOpen(true);
  };

  const handleMeetingSubmit = async (data: any) => {
    try {
      if (selectedMeeting) {
        const result = await updateMeeting(selectedMeeting.id, data);
        toast.success('Meeting updated');
        return result;
      } else {
        const result = await createMeeting(data);
        toast.success('Meeting scheduled');
        return result;
      }
    } catch (err) {
      console.error('Error saving meeting:', err);
      toast.error('Failed to save meeting');
    }
  };

  const handleMeetingDelete = async (meetingId: string) => {
    try {
      await deleteMeeting(meetingId);
      toast.success('Meeting removed');
    } catch (err) {
      console.error('Error deleting meeting:', err);
      toast.error('Failed to remove meeting');
    }
  };

  const handleCalendarUpdate = async (meeting: any) => {
    try {
      const { id, ...updates } = meeting;
      await updateMeeting(id, updates);
      toast.success('Meeting moved');
    } catch (err) {
      console.error('Error moving meeting:', err);
      toast.error('Failed to move meeting');
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

  if (isContextLoading) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
          <KeenIcon icon="loading" className="animate-spin text-3xl mb-4" />
          <p className="font-bold uppercase text-[10px] tracking-widest">Loading program data...</p>
        </div>
      </Container>
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <div className="flex items-center gap-5">
              <ToolbarHeading
                title="Program Calendar"
                description="View and manage all meetings across all mentor-mentee pairs"
              />
              <ProgramSelector />
            </div>
            <ToolbarActions>
              {/* Toolbar Actions remain empty here as minor filters are in the content area */}
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0">
        <div className="grid gap-5 lg:gap-7.5">
          {/* Calendar Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 p-2 sm:p-3 rounded-xl border border-gray-200">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                placeholder="Search meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                containerClassName="w-[200px] lg:w-[250px]"
                className="h-9 bg-white text-xs"
              />

              {pairs.length > 0 && (
                <Select value={selectedPairId || 'all'} onValueChange={handlePairFilter}>
                  <SelectTrigger className="w-[200px] lg:w-[250px] h-9 rounded-lg font-bold text-xs bg-white border-gray-200">
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
            </div>

            {stats && (
              <div className="flex items-center gap-4 bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex flex-col items-center border-r border-gray-100 pr-4">
                  <span className="text-[9px] font-black uppercase text-gray-400 leading-none mb-0.5">Upcoming</span>
                  <span className="text-xs font-black text-primary leading-tight">{stats.upcoming}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black uppercase text-gray-400 leading-none mb-0.5">Past</span>
                  <span className="text-xs font-black text-success leading-tight">{stats.past}</span>
                </div>
              </div>
            )}
          </div>

          <UpcomingMeetingsList 
            meetings={filteredMeetings} 
            isLoading={isLoading} 
            onMeetingClick={handleEditMeeting}
          />
          
          <MeetingCalendar
            meetings={filteredMeetings}
            pairs={pairs}
            onMeetingCreate={handleCreateNew}
            onMeetingUpdate={handleCalendarUpdate}
            onMeetingDelete={handleMeetingDelete}
            onMeetingClick={handleEditMeeting}
            selectedParticipant={selectedPairId}
            onPairFilter={handlePairFilter}
            showFilters={false}
          />
        </div>
      </Container>

      {/* Shared Meeting Dialog */}
      <MeetingDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        pairId={selectedMeeting?.pair_id || (selectedPairId !== 'all' ? selectedPairId : '')}
        meeting={selectedMeeting}
        onSubmit={handleMeetingSubmit}
        onDelete={handleMeetingDelete}
      />
    </>
  );
}
