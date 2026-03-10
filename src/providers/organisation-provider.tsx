import React, { createContext, useContext, useState, useMemo } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { fetchOrganisation, Organisation } from '@/lib/api/organisations';
import { fetchPrograms, Program } from '@/lib/api/programs';
import { useQuery } from '@tanstack/react-query';

interface OrganisationContextType {
  activeOrganisation: Organisation | null;
  activeProgram: Program | null;
  programs: Program[];
  isLoading: boolean;
  refreshOrganisation: () => void;
  refreshPrograms: () => void;
  setActiveProgram: (programId: string) => void;
}

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export function OrganisationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // Fetch user's organisation
  const { 
    data: organisation, 
    isLoading: isOrgLoading, 
    refetch: refetchOrg 
  } = useQuery({
    queryKey: ['organisation', user?.organisation_id],
    queryFn: () => (typeof user?.organisation_id === 'string' && user.organisation_id !== '[object Object]') 
      ? fetchOrganisation(user.organisation_id) 
      : Promise.resolve(null),
    enabled: typeof user?.organisation_id === 'string' && user.organisation_id !== '[object Object]',
  });

  // Fetch programs for this organisation
  const { 
    data: rawPrograms = [], 
    isLoading: isProgramsLoading,
    refetch: refetchPrograms
  } = useQuery({
    queryKey: ['programs', user?.organisation_id],
    queryFn: () => (typeof user?.organisation_id === 'string' && user.organisation_id !== '[object Object]') 
      ? fetchPrograms(user.organisation_id) 
      : Promise.resolve([]),
    enabled: typeof user?.organisation_id === 'string' && user.organisation_id !== '[object Object]',
  });

  // Sort programs: Active first, then latest start_date first
  const sortedPrograms = useMemo(() => {
    return [...rawPrograms].sort((a, b) => {
      // 1. Active first
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;

      // 2. Then by start_date (latest first)
      if (a.start_date && b.start_date) {
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      }
      if (a.start_date) return -1;
      if (b.start_date) return 1;

      return 0;
    });
  }, [rawPrograms]);

  // Determine active program: use selected if valid, otherwise top of sorted list
  const activeProgram = useMemo(() => {
    if (selectedProgramId) {
      const selected = sortedPrograms.find(p => p.id === selectedProgramId);
      if (selected) return selected;
    }
    return sortedPrograms[0] || null;
  }, [selectedProgramId, sortedPrograms]);

  const value = {
    activeOrganisation: organisation || null,
    activeProgram,
    programs: sortedPrograms,
    isLoading: isOrgLoading || isProgramsLoading,
    refreshOrganisation: refetchOrg,
    refreshPrograms: refetchPrograms,
    setActiveProgram: setSelectedProgramId
  };

  return (
    <OrganisationContext.Provider value={value}>
      {children}
    </OrganisationContext.Provider>
  );
}

export function useOrganisation() {
  const context = useContext(OrganisationContext);
  if (context === undefined) {
    throw new Error('useOrganisation must be used within an OrganisationProvider');
  }
  return context;
}
