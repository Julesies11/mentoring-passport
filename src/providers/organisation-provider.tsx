import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { fetchOrganisation, Organisation } from '@/lib/api/organisations';
import { fetchPrograms, fetchAssignedPrograms, Program } from '@/lib/api/programs';
import { useQuery } from '@tanstack/react-query';
import { getData, setData } from '@/lib/storage';

const MASQUERADE_KEY = 'mp_masquerade_org_id';

interface OrganisationContextType {
  activeOrganisation: Organisation | null;
  activeProgram: Program | null;
  programs: Program[];
  isLoading: boolean;
  isMasquerading: boolean;
  membershipRole: string | null;
  refreshOrganisation: () => void;
  refreshPrograms: () => void;
  setActiveProgram: (programId: string) => void;
  enterMasquerade: (orgId: string) => void;
  exitMasquerade: () => void;
}

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export function OrganisationProvider({ children }: { children: React.ReactNode }) {
  const { user, activeMembership } = useAuth();
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  
  // Masquerade state for Administrators
  const [masqueradedOrgId, setMasqueradedOrgId] = useState<string | null>(() => {
    return (getData(MASQUERADE_KEY) as string) || null;
  });

  // Determine effective organisation ID
  const effectiveOrgId = useMemo(() => {
    // 1. Masquerade has highest priority (for System Owners)
    if (user?.role === 'administrator' && masqueradedOrgId) {
      return masqueradedOrgId;
    }
    // 2. Then the active membership from switchOrganisation
    if (activeMembership?.organisation_id) {
      return activeMembership.organisation_id;
    }
    // 3. Fallback to legacy field
    return user?.organisation_id;
  }, [user, masqueradedOrgId, activeMembership]);

  const isMasquerading = !!(user?.role === 'administrator' && masqueradedOrgId);
  const baseMembershipRole = isMasquerading ? 'org-admin' : (activeMembership?.role || null);

  // Fetch organisation
  const { 
    data: organisation, 
    isLoading: isOrgLoading, 
    refetch: refetchOrg 
  } = useQuery({
    queryKey: ['organisation', effectiveOrgId],
    queryFn: () => (typeof effectiveOrgId === 'string' && effectiveOrgId !== '[object Object]') 
      ? fetchOrganisation(effectiveOrgId) 
      : Promise.resolve(null),
    enabled: typeof effectiveOrgId === 'string' && effectiveOrgId !== '[object Object]',
  });

  // Fetch programs
  const { 
    data: rawPrograms = [], 
    isLoading: isProgramsLoading,
    refetch: refetchPrograms
  } = useQuery({
    queryKey: ['programs', effectiveOrgId, user?.id, baseMembershipRole],
    queryFn: () => {
      if (!effectiveOrgId || typeof effectiveOrgId !== 'string' || effectiveOrgId === '[object Object]') {
        return Promise.resolve([]);
      }
      
      // Org Admins see ALL programs
      if (isMasquerading || baseMembershipRole === 'org-admin') {
        return fetchPrograms(effectiveOrgId);
      }

      // Regular supervisors see assigned programs
      return fetchAssignedPrograms(effectiveOrgId);
    },
    enabled: typeof effectiveOrgId === 'string' && effectiveOrgId !== '[object Object]',
  });

  // Reset selected program when organisation changes
  useEffect(() => {
    setSelectedProgramId(null);
  }, [effectiveOrgId]);

  // Sort programs
  const sortedPrograms = useMemo(() => {
    return [...rawPrograms].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      if (a.start_date && b.start_date) {
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      }
      if (a.start_date) return -1;
      if (b.start_date) return 1;
      return 0;
    });
  }, [rawPrograms]);

  // Determine active program
  const activeProgram = useMemo(() => {
    if (selectedProgramId) {
      const selected = sortedPrograms.find(p => p.id === selectedProgramId);
      if (selected) return selected;
    }
    return sortedPrograms[0] || null;
  }, [selectedProgramId, sortedPrograms]);

  const enterMasquerade = (orgId: string) => {
    if (user?.role !== 'administrator') return;
    setMasqueradedOrgId(orgId);
    setData(MASQUERADE_KEY, orgId);
  };

  const exitMasquerade = () => {
    setMasqueradedOrgId(null);
    setSelectedProgramId(null);
    setData(MASQUERADE_KEY, null);
    localStorage.removeItem(MASQUERADE_KEY);
  };

  const value = {
    activeOrganisation: organisation || null,
    activeProgram,
    programs: sortedPrograms,
    isLoading: isOrgLoading || isProgramsLoading,
    isMasquerading,
    isOrgAdmin: baseMembershipRole === 'org-admin',
    membershipRole: baseMembershipRole,
    refreshOrganisation: refetchOrg,
    refreshPrograms: refetchPrograms,
    setActiveProgram: setSelectedProgramId,
    enterMasquerade,
    exitMasquerade
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
