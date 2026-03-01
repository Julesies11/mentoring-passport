import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const { user } = useAuth();
  const { data: pairings = [], isLoading } = useUserPairs(user?.id || '');
  const [selectedPairingId, setSelectedPairingId] = useState<string | null>(null);

  // Initialize selected pairing
  useEffect(() => {
    if (!isLoading && pairings.length > 0 && !selectedPairingId) {
      // Try to get from localStorage first
      const savedId = localStorage.getItem(`selected_pairing_${user?.id}`);
      const stillExists = pairings.find(p => p.id === savedId);
      
      if (stillExists) {
        setSelectedPairingId(savedId);
      } else {
        // Default to the first active pairing or just the first pairing
        const firstActive = pairings.find(p => p.status === 'active');
        setSelectedPairingId(firstActive?.id || pairings[0].id);
      }
    }
  }, [pairings, isLoading, selectedPairingId, user?.id]);

  // Persist selection
  const handleSetSelectedPairingId = (id: string | null) => {
    setSelectedPairingId(id);
    if (id && user?.id) {
      localStorage.setItem(`selected_pairing_${user?.id}`, id);
    }
  };

  const selectedPairing = pairings.find(p => p.id === selectedPairingId) || null;

  return (
    <PairingContext.Provider
      value={{
        selectedPairingId,
        setSelectedPairingId: handleSetSelectedPairingId,
        selectedPairing,
        pairings,
        isLoading,
      }}
    >
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
