import React from 'react';
import { usePairing } from '@/providers/pairing-provider';
import { useAuth } from '@/auth/context/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { ProfileAvatar } from '@/components/profile/profile-avatar';

export function PairingSelector() {
  const { pairings, selectedPairing, setSelectedPairingId, isLoading } = usePairing();
  const { user, isMentor, isMentee } = useAuth();

  if (isLoading || pairings.length <= 1) {
    if (pairings.length === 1 && selectedPairing) {
      const otherUser = isMentor ? selectedPairing.mentee : selectedPairing.mentor;
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 border rounded-lg bg-secondary/30">
          <ProfileAvatar 
            userId={otherUser?.id || ''} 
            userName={otherUser?.full_name || otherUser?.email} 
            size="xs" 
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold leading-none">{otherUser?.full_name}</span>
            <span className="text-[10px] text-muted-foreground leading-none mt-1">
              {isMentor ? 'Mentee' : 'Mentor'}
            </span>
          </div>
        </div>
      );
    }
    return null;
  }

  const otherUser = isMentor ? selectedPairing?.mentee : selectedPairing?.mentor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 h-auto py-1.5 px-3 bg-secondary/30 border-primary/20 hover:bg-secondary/50">
          <ProfileAvatar 
            userId={otherUser?.id || ''} 
            userName={otherUser?.full_name || otherUser?.email} 
            size="xs" 
          />
          <div className="flex flex-col items-start text-left">
            <span className="text-xs font-semibold leading-none">
              {otherUser?.full_name || 'Select Pairing'}
            </span>
            <span className="text-[10px] text-muted-foreground leading-none mt-1">
              {isMentor ? 'Mentee' : 'Mentor'}
            </span>
          </div>
          <KeenIcon icon="down" className="text-xs ms-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {pairings.map((pair) => {
          const pairOtherUser = isMentor ? pair.mentee : pair.mentor;
          return (
            <DropdownMenuItem
              key={pair.id}
              onClick={() => setSelectedPairingId(pair.id)}
              className="flex items-center gap-3 cursor-pointer py-2"
            >
              <ProfileAvatar 
                userId={pairOtherUser?.id || ''} 
                userName={pairOtherUser?.full_name || pairOtherUser?.email} 
                size="sm" 
              />
              <div className="flex flex-col">
                <span className={`text-sm ${selectedPairing?.id === pair.id ? 'font-bold' : ''}`}>
                  {pairOtherUser?.full_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {pair.status}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
