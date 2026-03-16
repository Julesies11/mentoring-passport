import { PropsWithChildren, useEffect, useState, useRef } from 'react';
import { SupabaseAdapter } from '@/auth/adapters/supabase-adapter';
import { AuthContext } from '@/auth/context/auth-context';
import { supabase } from '@/lib/supabase';
import { logDebug } from '@/lib/logger';
import * as authHelper from '@/auth/lib/helpers';
import { AuthModel, UserModel } from '@/auth/lib/models';

// Define the Supabase Auth Provider
export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth());
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSystemOwner, setIsSystemOwner] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [isMentee, setIsMentee] = useState(false);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const hasAutoSelected = useRef(false);

  // 1. Derive active context STRICTLY from JWT metadata
  // We ignore currentUser.organisation_id here because that is a static profile field,
  // not a dynamic session context.
  const activeOrgId = currentUser?.selected_organisation_id;
  
  // Find the membership matching the ACTIVE context
  const activeMembership = currentUser?.memberships?.find(
    m => m.organisation_id === activeOrgId
  );

  // 2. Derive roles synchronously to prevent layout flashes/race conditions
  const currentIsSystemOwner = !!currentUser?.is_admin || currentUser?.role === 'administrator';
  
  // For the effective role, we prefer the one signed in the JWT metadata.
  // If no context is active yet, we don't have an effective org-role (unless System Owner).
  const effectiveRole = currentUser?.role || activeMembership?.role;
  const currentIsOrgAdmin = currentIsSystemOwner || activeMembership?.role === 'org-admin';
  const currentIsSupervisor = currentIsOrgAdmin || activeMembership?.role === 'supervisor';

  // Debug logging
  useEffect(() => {
    if (currentUser) {
      console.log('AuthProvider: Context Updated', { 
        email: currentUser.email, 
        activeOrgId, 
        role: effectiveRole,
        membershipCount: currentUser.memberships?.length,
        hasActiveMembership: !!activeMembership,
        isAutoSelecting
      });
    }
  }, [currentUser?.id, activeOrgId, effectiveRole, !!activeMembership, isAutoSelecting]);

  // Initial session verification
  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        logDebug('AuthProvider: Initial session found, verifying...');
        await verify();
      } else {
        logDebug('AuthProvider: No initial session found.');
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Check pairings based on active context
  useEffect(() => {
    // Sync state-based flags for backward compatibility/external hooks
    setIsSystemOwner(currentIsSystemOwner);
    setIsAdmin(currentIsSystemOwner);
    setIsOrgAdmin(currentIsOrgAdmin);
    setIsSupervisor(currentIsSupervisor);

    const checkPairings = async () => {
      if (currentUser?.id && activeOrgId) {
        try {
          // Check active pairings in this specific organisation
          const { count: mentorCount } = await supabase
            .from('mp_pairs')
            .select('*', { count: 'exact', head: true })
            .eq('mentor_id', currentUser.id)
            .eq('organisation_id', activeOrgId)
            .eq('status', 'active');
          
          const { count: menteeCount } = await supabase
            .from('mp_pairs')
            .select('*', { count: 'exact', head: true })
            .eq('mentee_id', currentUser.id)
            .eq('organisation_id', activeOrgId)
            .eq('status', 'active');

          setIsMentor((mentorCount || 0) > 0);
          setIsMentee((menteeCount || 0) > 0);
        } catch (error) {
          console.error('Error checking pairings:', error);
        }
      } else {
        setIsMentor(false);
        setIsMentee(false);
      }
    };

    checkPairings();
  }, [currentUser?.id, activeOrgId, currentIsSystemOwner, currentIsOrgAdmin, currentIsSupervisor]);

  // AUTO-SELECTION LOGIC: If user has 1 org and no active context, set it automatically
  useEffect(() => {
    const autoSelect = async () => {
      if (currentUser && !activeOrgId && currentUser.memberships?.length === 1 && !hasAutoSelected.current) {
        hasAutoSelected.current = true;
        setIsAutoSelecting(true);
        
        // Brief delay to allow initial layout to settle and prevent double-loading triggers
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const onlyOrgId = currentUser.memberships[0].organisation_id;
        console.log('AuthProvider: Auto-selecting single organization:', onlyOrgId);
        try {
          await switchOrganisation(onlyOrgId);
        } catch (error) {
          console.error('AuthProvider: Auto-selection failed:', error);
          // Do not reset hasAutoSelected to prevent infinite retry loops on permanent failures
        } finally {
          setIsAutoSelecting(false);
        }
      }
    };
    
    if (!loading) {
      autoSelect();
    }
  }, [currentUser, activeOrgId, loading]);

  // Derive if we are about to auto-select to prevent layout flashes
  const willAutoSelect = !!(currentUser && !activeOrgId && currentUser.memberships?.length === 1 && !hasAutoSelected.current);

  const switchOrganisation = async (orgId: string) => {
    setLoading(true);
    try {
      const updatedUser = await SupabaseAdapter.switchOrganisation(orgId);
      setCurrentUser(updatedUser);
      // Reset mentor/mentee states until checkPairings runs
      setIsMentor(false);
      setIsMentee(false);
    } catch (error) {
      console.error('Failed to switch organisation:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (auth) {
      setLoading(true); // Ensure loading is true while verifying
      try {
        const user = await getUser();
        setCurrentUser(user || undefined);
      } catch (err) {
        console.error('AuthProvider: Verification failed:', err);
        saveAuth(undefined);
        setCurrentUser(undefined);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const saveAuth = (auth: AuthModel | undefined) => {
    setAuth(auth);
    if (auth) {
      authHelper.setAuth(auth);
    } else {
      authHelper.removeAuth();
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const auth = await SupabaseAdapter.login(email, password);
      saveAuth(auth);
      const user = await getUser();
      setCurrentUser(user || undefined);
    } catch (error) {
      saveAuth(undefined);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    password_confirmation: string,
    firstName?: string,
    lastName?: string,
  ) => {
    setLoading(true);
    try {
      const auth = await SupabaseAdapter.register(
        email,
        password,
        password_confirmation,
        firstName,
        lastName,
      );
      saveAuth(auth);
      const user = await getUser();
      setCurrentUser(user || undefined);
    } catch (error) {
      saveAuth(undefined);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    await SupabaseAdapter.requestPasswordReset(email);
  };

  const resetPassword = async (
    password: string,
    password_confirmation: string,
  ) => {
    await SupabaseAdapter.resetPassword(password, password_confirmation);
  };

  const resendVerificationEmail = async (email: string) => {
    await SupabaseAdapter.resendVerificationEmail(email);
  };

  const getUser = async () => {
    return await SupabaseAdapter.getCurrentUser();
  };

  const updateProfile = async (userData: Partial<UserModel>) => {
    const updatedUser = await SupabaseAdapter.updateUserProfile(userData);
    setCurrentUser(updatedUser);
    return updatedUser;
  };

  const logout = () => {
    SupabaseAdapter.logout();
    saveAuth(undefined);
    setCurrentUser(undefined);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        setLoading,
        auth,
        saveAuth,
        user: currentUser,
        setUser: setCurrentUser,
        login,
        register,
        requestPasswordReset,
        resetPassword,
        resendVerificationEmail,
        getUser,
        updateProfile,
        logout,
        verify,
        isAdmin: currentIsSystemOwner,
        // Mentoring Passport role helpers
        role: effectiveRole,
        profileId: currentUser?.profile_id,
        isSystemOwner: currentIsSystemOwner,
        isOrgAdmin: currentIsOrgAdmin,
        isSupervisor: currentIsSupervisor,
        isMentor,
        isMentee,
        isAutoSelecting: isAutoSelecting || willAutoSelect,
        setIsMentor,
        setIsMentee,
        // Multi-tenant
        memberships: currentUser?.memberships || [],
        activeMembership,
        switchOrganisation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
