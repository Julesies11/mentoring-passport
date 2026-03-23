import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useAllMeetings } from '@/hooks/use-meetings';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeenIcon } from '@/components/keenicons';
import { MeetingCalendar } from '@/components/calendar/meeting-calendar';
import { MeetingDialog } from '@/components/meetings/meeting-dialog';
import { UpcomingMeetingsList } from '@/components/meetings/upcoming-meetings-list';
import { toast } from 'sonner';
import { usePairing } from '@/providers/pairing-provider';
import type { Meeting } from '@/lib/api/meetings';

export function ProgramMemberMeetingsPage() {
  const [searchParams] = useSearchParams();
  const highlightMeetingId = searchParams.get('id');
  const { pairings: pairs = [], selectedPairing: activePair } = usePairing();

  const { 
    meetings = [], 
    isLoading, 
    createMeeting, 
    updateMeeting, 
    deleteMeeting,
    isCreating,
    isUpdating
  } = useAllMeetings();

  // Effect for scrolling to deep-linked meeting and opening dialog
  useEffect(() => {
    if (highlightMeetingId && !isLoading && meetings.length > 0) {
      const targetMeeting = meetings.find(m => m.id === highlightMeetingId);
      
      // 1. Open the dialog immediately if meeting is found
      if (targetMeeting) {
        setSelectedMeeting(targetMeeting);
        setIsDialogOpen(true);
      }

      // 2. Visual scroll and pulse
      const timer = setTimeout(() => {
        const element = document.getElementById(`meeting-${highlightMeetingId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary/20', 'bg-primary/[0.02]');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary/20', 'bg-primary/[0.02]');
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightMeetingId, isLoading, meetings]);

  const isArchived = activePair?.program?.status === 'inactive' || activePair?.status === 'archived';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [initialDate, setInitialDate] = useState<string | null>(null);
  const [selectedPairId, setSelectedPairId] = useState<string>('all');

  // Clear state when dialog closes
  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedMeeting(null);
      setInitialDate(null);
    }
  };

  // Filter meetings for the relationship
  const filteredMeetings = useMemo(() => {
    // 1. First, only show meetings where the user is actually part of the pair
    const myMeetings = meetings.filter(m => 
      pairs.some(p => p.id === m.pair_id)
    );

    // 2. Then, apply the local pair filter if one is selected
    if (!selectedPairId || selectedPairId === 'all') {
      return myMeetings;
    }

    return myMeetings.filter(m => m.pair_id === selectedPairId);
  }, [meetings, pairs, selectedPairId]);

  const handleCreateNew = () => {
    setSelectedMeeting(null);
    setInitialDate(null);
    setIsDialogOpen(true);
  };

  const handlePairFilter = (pairId: string) => {
    setSelectedPairId(pairId);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setInitialDate(null);
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
    } catch (error) {
      console.error('Error saving meeting:', error);
      toast.error('Failed to save meeting');
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await deleteMeeting(meetingId);
      toast.success('Meeting removed');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to remove meeting');
    }
  };

  const handleCalendarUpdate = async (meeting: any) => {
    try {
      const { id, ...updates } = meeting;
      await updateMeeting(id, updates);
      toast.success('Meeting rescheduled');
    } catch (error) {
      console.error('Error updating meeting:', error);
      toast.error('Failed to update meeting');
    }
  };

  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <ToolbarHeading
              title="Mentoring Meetings"
              description="Schedule and manage your mentoring sessions"
            />
            <ToolbarActions>
              {!isArchived && (
                <Button onClick={handleCreateNew}>
                  <KeenIcon icon="plus" />
                  Schedule Meeting
                </Button>
              )}
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0 mt-4">
        <div className="grid gap-2 sm:gap-5 lg:gap-7.5">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
              <p>Loading meetings...</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-8">
              {/* Upcoming Section (Reusable Component) */}
              <UpcomingMeetingsList 
                meetings={filteredMeetings} 
                isLoading={isLoading} 
                onMeetingClick={handleEditMeeting}
              />
              
              {/* Mobile-only Add Button */}
              {!isArchived && (
                <div className="sm:hidden mb-4">
                   <Button onClick={handleCreateNew} className="w-full h-12 rounded-xl font-bold gap-2">
                      <KeenIcon icon="plus" />
                      Schedule New Meeting
                    </Button>
                </div>
              )}

              {/* Calendar Section */}
              <div className="space-y-4 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                  <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                    <KeenIcon icon="calendar" className="text-primary text-base" />
                    Full Calendar
                  </h3>
                  
                  {pairs.length > 1 && (
                    <div className="flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-lg border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight px-2">Filter:</span>
                      <Select value={selectedPairId} onValueChange={handlePairFilter}>
                        <SelectTrigger className="h-8 min-w-[180px] rounded-md border-none bg-white font-bold text-[11px] shadow-sm">
                          <SelectValue placeholder="All Relationships" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl shadow-xl">
                          <SelectItem value="all">All Relationships</SelectItem>
                          {pairs.map(pair => (
                            <SelectItem key={pair.id} value={pair.id}>
                              {pair.mentor?.full_name} ↔ {pair.mentee?.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border-0 sm:border border-gray-200 overflow-hidden shadow-none sm:shadow-sm">
                  <MeetingCalendar 
                    meetings={filteredMeetings}
                    pairs={pairs}
                    selectedParticipant={selectedPairId}
                    onPairFilter={handlePairFilter}
                    onMeetingCreate={handleMeetingSubmit}
                    onMeetingUpdate={handleCalendarUpdate}
                    onMeetingDelete={handleDeleteMeeting}
                    onMeetingClick={handleEditMeeting}
                    showAddButton={false}
                    showFilters={false}
                    readOnly={isArchived}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* Shared Meeting Dialog */}
      <MeetingDialog
        open={isDialogOpen}
        onOpenChange={handleOpenChange}
        pairId={selectedMeeting?.pair_id || (selectedPairId !== 'all' ? selectedPairId : (activePair?.id || (pairs.length > 0 ? pairs[0].id : '')))}
        meeting={selectedMeeting}
        initialDate={initialDate}
        onSubmit={handleMeetingSubmit}
        onDelete={handleDeleteMeeting}
        isSubmitting={selectedMeeting ? isUpdating : isCreating}
      />
    </>
  );
}
