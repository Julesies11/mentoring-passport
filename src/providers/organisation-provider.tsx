import React, { createContext, useContext, useState, useMemo } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { Organisation } from '@/lib/api/organisations';
import { fetchAssignedPrograms, Program } from '@/lib/api/programs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface OrganisationContextType {
  activeOrganisation: Organisation | null;
  activeProgram: Program | null;
  programs: Program[];
  isLoading: boolean;
  isOrgAdmin: boolean;
  isSupervisor: boolean;
  membershipRole: string | null;
  refreshOrganisation: () => void;
  refreshPrograms: () => void;
  setActiveProgram: (programId: string) => void;
}

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export function OrganisationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isSupervisor, isOrgAdmin, isSysAdmin } = useAuth();
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  const isPrivileged = isSupervisor || isOrgAdmin || isSysAdmin;

  // Fetch singleton organisation (branding/name)
  const { 
    data: organisation, 
    isLoading: isOrgLoading, 
    refetch: refetchOrg 
  } = useQuery({
    queryKey: ['organisation', 'singleton'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mp_organisations').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !authLoading && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Fetch programs available in this instance
  const { 
    data: rawPrograms = [], 
    isLoading: isProgramsLoading,
    refetch: refetchPrograms
  } = useQuery({
    queryKey: ['programs', user?.id, isPrivileged],
    queryFn: () => {
      if (!isPrivileged) return Promise.resolve([]);
      return fetchAssignedPrograms();
    },
    enabled: isPrivileged && !authLoading && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const sortedPrograms = useMemo(() => {
    return [...rawPrograms].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime();
    });
  }, [rawPrograms]);

  const activeProgram = useMemo(() => {
    if (selectedProgramId) {
      const found = sortedPrograms.find(p => p.id === selectedProgramId);
      if (found) return found;
    }
    
    // Default to the first program in the sorted list (which prioritizes active ones)
    return sortedPrograms[0] || null;
  }, [selectedProgramId, sortedPrograms]);

  const value = useMemo(() => ({
    activeOrganisation: organisation || null,
    activeProgram,
    programs: sortedPrograms,
    isLoading: authLoading || isOrgLoading || isProgramsLoading,
    isOrgAdmin: user?.role === 'administrator' || user?.role === 'org-admin',
    isSupervisor: isSupervisor,
    membershipRole: user?.role || null,
    refreshOrganisation: refetchOrg,
    refreshPrograms: refetchPrograms,
    setActiveProgram: setSelectedProgramId
  }), [
    organisation, 
    activeProgram, 
    sortedPrograms, 
    authLoading, 
    isOrgLoading, 
    isProgramsLoading, 
    user?.role, 
    isSupervisor, 
    refetchOrg, 
    refetchPrograms
  ]);

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
