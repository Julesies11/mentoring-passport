import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePairs } from '@/hooks/use-pairs';
import { useParticipantsByRole } from '@/hooks/use-participants';
import { useOrganisation } from '@/providers/organisation-provider';
import { toast } from 'sonner';
import { PairsStats } from './pairs/PairsStats';
import { PairsManagementTable } from './pairs/PairsManagementTable';
import { UnpairedParticipantsTable } from './pairs/UnpairedParticipantsTable';
import { MatchmakerDialog } from './pairs/MatchmakerDialog';

const EMPTY_ARRAY: any[] = [];

export function PairsContent() {
  const [searchParams] = useSearchParams();
  const highlightPairId = searchParams.get('pairId');
  const { pairs = EMPTY_ARRAY, stats, isLoading, createPairAsync, isCreating } = usePairs();
  const { activeProgram } = useOrganisation();

  // Effect for highlighting deep-linked pair
  useEffect(() => {
    if (highlightPairId && !isLoading) {
      // Small delay to ensure table is rendered
      const timer = setTimeout(() => {
        const element = document.getElementById(`pair-${highlightPairId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-primary/5', 'ring-2', 'ring-primary/20');
          setTimeout(() => {
            element.classList.remove('bg-primary/5', 'ring-2', 'ring-primary/20');
          }, 3000);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightPairId, isLoading, pairs]);

  const { data: participants = EMPTY_ARRAY } = useParticipantsByRole('program-member');
  
  const [matchmakerOpen, setMatchmakerOpen] = useState(false);
  const [selectedInitialMentorId, setSelectedInitialMentorId] = useState('');

  // Calculate unpaired count for the stats card
  const unpairedCount = useMemo(() => {
    return participants.filter(p => {
      const hasActiveMentorPair = pairs.some(pair => pair.mentor_id === p.id && pair.status === 'active');
      const hasActiveMenteePair = pairs.some(pair => pair.mentee_id === p.id && pair.status === 'active');
      return !hasActiveMentorPair && !hasActiveMenteePair && p.status === 'active';
    }).length;
  }, [participants, pairs]);

  const handleCreatePair = async (mentorId: string, menteeId: string) => {
    try {
      await createPairAsync({
        mentor_id: mentorId,
        mentee_id: menteeId,
      });
      toast.success('Pairing created successfully');
      setMatchmakerOpen(false);
      setSelectedInitialMentorId('');
    } catch (error: any) {
      console.error('Error in handleCreatePair:', error);
      if (error.code === '23505') {
        toast.error('This mentor and mentee already have an active pairing.');
      } else {
        toast.error('Failed to create pairing. Please try again.');
      }
    }
  };

  const handlePairNow = (participantId: string) => {
    setSelectedInitialMentorId(participantId);
    setMatchmakerOpen(true);
  };

  return (
    <div className="grid gap-2 sm:gap-5 lg:gap-7.5">
      <PairsStats 
        stats={stats}
        unpairedCount={unpairedCount}
        onShowUnpaired={() => {
          const element = document.getElementById('unpaired-table');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      />

      <PairsManagementTable 
        pairs={pairs}
        isLoading={isLoading}
        onShowMatchmaker={() => {
          setSelectedInitialMentorId('');
          setMatchmakerOpen(true);
        }}
      />

      <div id="unpaired-table">
        <UnpairedParticipantsTable 
          participants={participants}
          pairs={pairs}
          onPairNow={handlePairNow}
          programTitle={activeProgram?.title}
        />
      </div>

      <MatchmakerDialog 
        open={matchmakerOpen}
        onOpenChange={setMatchmakerOpen}
        participants={participants}
        pairs={pairs}
        onCreatePair={handleCreatePair}
        isCreating={isCreating}
        initialMentorId={selectedInitialMentorId}
      />
    </div>
  );
}
