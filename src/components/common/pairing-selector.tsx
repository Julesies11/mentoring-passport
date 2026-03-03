import React from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { usePairing } from '@/providers/pairing-provider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ProfileAvatar } from '@/components/profile/profile-avatar';

export function PairingSelector() {
  const { user } = useAuth();
  const { pairings, selectedPairingId, setSelectedPairingId, isLoading } = usePairing();

  if (isLoading || pairings.length === 0) return null;

  const selectedPair = pairings.find(p => p.id === selectedPairingId);
  const isUserMentorInSelected = selectedPair?.mentor_id === user?.id;
  const partnerRoleLabel = isUserMentorInSelected ? 'YOUR MENTEE' : 'YOUR MENTOR';

  return (
    <div className="flex flex-col gap-2 w-full max-w-md mb-6 animate-fade-in px-1">
      <label className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest px-1">
        {partnerRoleLabel}
      </label>
      <Select 
        value={selectedPairingId || ''} 
        onValueChange={(value) => setSelectedPairingId(value)}
      >
        <SelectTrigger className="h-auto py-3 px-4 bg-white border-gray-200 hover:border-primary transition-all shadow-sm rounded-xl w-full overflow-hidden">
          <SelectValue placeholder="Choose relationship" />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-gray-200 shadow-xl p-1 max-w-[calc(100vw-2rem)]">
          {pairings.map((pair) => {
            const isUserMentor = pair.mentor_id === user?.id;
            const partner = isUserMentor ? pair.mentee : pair.mentor;
            const partnerName = partner?.full_name || partner?.email || 'Unknown User';
            const partnerRole = isUserMentor ? 'Mentee' : 'Mentor';
            const isActive = pair.status === 'active';

            return (
              <SelectItem 
                key={pair.id} 
                value={pair.id}
                className="rounded-lg py-2 cursor-pointer focus:bg-primary/5 focus:text-primary mb-1 last:mb-0"
              >
                <div className="flex items-center gap-3 w-full overflow-hidden">
                  <div className="relative shrink-0">
                    <ProfileAvatar
                      userId={partner?.id || ''}
                      currentAvatar={partner?.avatar_url}
                      userName={partnerName}
                      size="md"
                    />
                    {isActive && (
                      <span className="absolute bottom-0 right-0 size-2.5 bg-success rounded-full border-2 border-white"></span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate block">{partnerName}</span>
                      {!isActive && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 uppercase font-black tracking-tighter shrink-0">
                          Past
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight truncate block">
                      {partnerRole} • {partner?.job_title || 'Program Participant'}
                    </span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
