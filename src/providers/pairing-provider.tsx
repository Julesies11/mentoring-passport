import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';

interface PairingContextType {
  selectedPairingId: string | null;
  setSelectedPairingId: (id: string | null) => void;
  selectedPairing: any | null;
  pairings: any[];
  isLoading: boolean;
}

const PairingContext = createContext<PairingContextType | undefined>(undefined);

export function PairingProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { data: rawPairings = [], isLoading: queryLoading } = useUserPairs(user?.id || '');
  const [selectedPairingId, setSelectedPairingId] = useState<string | null>(null);

  const isLoading = authLoading || queryLoading;

  // Apply custom sorting: Active status > Latest Program > Name
  const sortedPairings = useMemo(() => {
    return [...rawPairings].sort((a, b) => {
      // 1. Sort by Status (Active Pair AND Active Program first)
      const aActive = a.status === 'active' && a.program?.status === 'active';
      const bActive = b.status === 'active' && b.program?.status === 'active';
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;

      // 2. Sort by Latest Program Start Date (desc)
      const aDate = a.program?.start_date ? new Date(a.program.start_date).getTime() : 0;
      const bDate = b.program?.start_date ? new Date(b.program.start_date).getTime() : 0;
      if (aDate !== bDate) return bDate - aDate;

      // 3. Sort by Name
      const aIsMentor = a.mentor_id === user?.id;
      const bIsMentor = b.mentor_id === user?.id;
      const aName = (aIsMentor ? a.mentee?.full_name : a.mentor?.full_name) || '';
      const bName = (bIsMentor ? b.mentee?.full_name : b.mentor?.full_name) || '';
      return aName.localeCompare(bName);
    });
  }, [rawPairings, user?.id]);

  // Initialize selected pairing
  useEffect(() => {
    if (!isLoading && sortedPairings.length > 0) {
      const savedId = localStorage.getItem(`selected_pairing_${user?.id}`);
      const stillExists = sortedPairings.find(p => p.id === savedId);
      
      if (stillExists) {
        if (selectedPairingId !== savedId) {
          setSelectedPairingId(savedId);
        }
      } else {
        // Default to the first pairing in the list (which is now sorted by "Double-Active" first)
        const defaultId = sortedPairings[0].id;
        if (selectedPairingId !== defaultId) {
          setSelectedPairingId(defaultId);
        }
      }
    } else if (!isLoading && sortedPairings.length === 0) {
      if (selectedPairingId !== null) {
        setSelectedPairingId(null);
      }
    }
  }, [sortedPairings, isLoading, user?.id, selectedPairingId]);

  // Persist selection
  const handleSetSelectedPairingId = useCallback((id: string | null) => {
    setSelectedPairingId(id);
    if (id && user?.id) {
      localStorage.setItem(`selected_pairing_${user?.id}`, id);
    }
  }, [user?.id]);

  const selectedPairing = useMemo(() => 
    sortedPairings.find(p => p.id === selectedPairingId) || null,
    [sortedPairings, selectedPairingId]
  );

  const contextValue = useMemo(() => ({
    selectedPairingId,
    setSelectedPairingId: handleSetSelectedPairingId,
    selectedPairing,
    pairings: sortedPairings,
    isLoading,
  }), [selectedPairingId, selectedPairing, sortedPairings, isLoading, handleSetSelectedPairingId]);

  return (
    <PairingContext.Provider value={contextValue}>
      {children}
    </PairingContext.Provider>
  );
}

export function usePairing() {
  const context = useContext(PairingContext);
  if (context === undefined) {
    throw new Error('usePairing must be used within a PairingProvider');
  }
  return context;
}
