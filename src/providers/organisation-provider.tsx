import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { fetchOrganisation, Organisation } from '@/lib/api/organisations';
import { fetchAssignedPrograms, Program } from '@/lib/api/programs';
import { useQuery } from '@tanstack/react-query';

interface OrganisationContextType {
  activeOrganisation: Organisation | null;
  activeProgram: Program | null;
  programs: Program[];
  isLoading: boolean;
  isMasquerading: boolean;
  isOrgAdmin: boolean;
  isSupervisor: boolean;
  membershipRole: string | null;
  refreshOrganisation: () => void;
  refreshPrograms: () => void;
  setActiveProgram: (programId: string) => void;
  enterMasquerade: (orgId: string) => void;
  exitMasquerade: () => void;
}

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export function OrganisationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isAutoSelecting } = useAuth();
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // The JWT is our Source of Truth. These values come from user_metadata.
  const effectiveOrgId = user?.selected_organisation_id || user?.organisation_id;
  const membershipRole = user?.role; // This is the 'active_role' injected into the JWT
  const isMasquerading = !!user?.is_system_owner && !!user?.selected_organisation_id;
  
  const isOrgAdmin = user?.is_org_admin || membershipRole === 'org-admin';
  const isSupervisor = user?.is_supervisor || isOrgAdmin || membershipRole === 'supervisor';

  // Fetch organisation details (for UI logos/names)
  const { 
    data: organisation, 
    isLoading: isOrgLoading, 
    refetch: refetchOrg 
  } = useQuery({
    queryKey: ['organisation', effectiveOrgId],
    queryFn: () => (effectiveOrgId && typeof effectiveOrgId === 'string') 
      ? fetchOrganisation(effectiveOrgId) 
      : Promise.resolve(null),
    enabled: !!effectiveOrgId && !authLoading && !isAutoSelecting,
  });

  // Fetch programs available to this active context
  const { 
    data: rawPrograms = [], 
    isLoading: isProgramsLoading,
    refetch: refetchPrograms
  } = useQuery({
    queryKey: ['programs', effectiveOrgId, user?.id, isSupervisor],
    queryFn: () => {
      if (!effectiveOrgId || !isSupervisor) return Promise.resolve([]);
      return fetchAssignedPrograms(effectiveOrgId);
    },
    enabled: !!effectiveOrgId && isSupervisor && !authLoading && !isAutoSelecting,
  });

  // Reset selected program when organisation context changes
  useEffect(() => {
    setSelectedProgramId(null);
  }, [effectiveOrgId]);

  const sortedPrograms = useMemo(() => {
    return [...rawPrograms].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime();
    });
  }, [rawPrograms]);

  const activeProgram = useMemo(() => {
    if (selectedProgramId) {
      return sortedPrograms.find(p => p.id === selectedProgramId) || null;
    }
    return sortedPrograms[0] || null;
  }, [selectedProgramId, sortedPrograms]);

  const value = {
    activeOrganisation: organisation || null,
    activeProgram,
    programs: sortedPrograms,
    isLoading: authLoading || isAutoSelecting || isOrgLoading || isProgramsLoading,
    isMasquerading,
    isOrgAdmin,
    isSupervisor,
    membershipRole: membershipRole || null,
    refreshOrganisation: refetchOrg,
    refreshPrograms: refetchPrograms,
    setActiveProgram: setSelectedProgramId,
    enterMasquerade: () => {}, // Handled by switchOrganisation in AuthContext
    exitMasquerade: () => {}   // Handled by switchOrganisation in AuthContext
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
