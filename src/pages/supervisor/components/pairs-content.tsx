import { useState, useMemo } from 'react';
import { usePairs } from '@/hooks/use-pairs';
import { useParticipantsByRole } from '@/hooks/use-participants';
import { toast } from 'sonner';
import { PairsStats } from './pairs/PairsStats';
import { PairsTable } from './pairs/PairsTable';
import { UnpairedDialog } from './pairs/UnpairedDialog';
import { MatchmakerDialog } from './pairs/MatchmakerDialog';

const EMPTY_ARRAY: any[] = [];

export function PairsContent() {
  const { pairs = EMPTY_ARRAY, stats, isLoading, createPairAsync, isCreating } = usePairs();
  const { data: participants = EMPTY_ARRAY } = useParticipantsByRole('program-member');
  
  const [matchmakerOpen, setMatchmakerOpen] = useState(false);
  const [unpairedOpen, setUnpairedOpen] = useState(false);
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
    setUnpairedOpen(false);
    setMatchmakerOpen(true);
  };

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <PairsStats 
        stats={stats}
        unpairedCount={unpairedCount}
        onShowUnpaired={() => setUnpairedOpen(true)}
      />

      <PairsTable 
        pairs={pairs}
        isLoading={isLoading}
        onShowMatchmaker={() => {
          setSelectedInitialMentorId('');
          setMatchmakerOpen(true);
        }}
      />

      <UnpairedDialog 
        open={unpairedOpen}
        onOpenChange={setUnpairedOpen}
        participants={participants}
        pairs={pairs}
        onPairNow={handlePairNow}
      />

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
