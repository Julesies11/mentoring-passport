import { useState, useEffect } from 'react';
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

  // Effect for scrolling to deep-linked meeting
  useEffect(() => {
    if (highlightMeetingId && !isLoading) {
      // Small delay to ensure list is rendered
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

  // Filter meetings for the relationship
  const filteredMeetings = meetings.filter(m => 
    pairs.some(p => p.id === m.pair_id)
  );

  const handleCreateNew = () => {
    setSelectedMeeting(null);
    setInitialDate(null);
    setIsDialogOpen(true);
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
        toast.success('Meeting updated successfully');
        return result;
      } else {
        const result = await createMeeting(data);
        toast.success('Meeting scheduled successfully');
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
      toast.success('Meeting updated successfully');
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
                <div className="flex items-center gap-4 px-1">
                  <h3 className="text-sm font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                    <KeenIcon icon="calendar" className="text-primary text-base" />
                    Full Calendar
                  </h3>
                  <div className="h-px bg-gray-100 flex-1 ml-4" />
                </div>
                <div className="bg-white rounded-xl border-0 sm:border border-gray-200 overflow-hidden shadow-none sm:shadow-sm">
                  <MeetingCalendar 
                    meetings={filteredMeetings}
                    pairs={pairs}
                    selectedParticipant={activePair?.id || ''}
                    onMeetingCreate={handleMeetingSubmit}
                    onMeetingUpdate={handleCalendarUpdate}
                    onMeetingDelete={handleDeleteMeeting}
                    onMeetingClick={handleEditMeeting}
                    showAddButton={false}
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
        onOpenChange={setIsDialogOpen}
        pairId={activePair?.id || (selectedMeeting?.pair_id || '')}
        meeting={selectedMeeting}
        initialDate={initialDate}
        onSubmit={handleMeetingSubmit}
        onDelete={handleDeleteMeeting}
        isSubmitting={selectedMeeting ? isUpdating : isCreating}
      />
    </>
  );
}
