import { PropsWithChildren, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { SupabaseAdapter } from '@/auth/adapters/supabase-adapter';
import { AuthContext } from '@/auth/context/auth-context';
import { supabase } from '@/lib/supabase';
import { logDebug } from '@/lib/logger';
import * as authHelper from '@/auth/lib/helpers';
import { AuthModel, UserModel } from '@/auth/lib/models';

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth());
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>();
  const [isMentor, setIsMentor] = useState(false);
  const [isMentee, setIsMentee] = useState(false);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const hasAutoSelected = useRef(false);

  // 1. Derive active context STRICTLY from JWT metadata
  const activeOrgId = currentUser?.selected_organisation_id;
  
  // Find the membership matching the ACTIVE context
  const activeMembership = useMemo(() => 
    currentUser?.memberships?.find(m => m.organisation_id === activeOrgId),
    [currentUser?.memberships, activeOrgId]
  );

  // 2. Derive roles synchronously
  const currentIsSystemOwner = !!currentUser?.is_admin || currentUser?.role === 'administrator';
  const effectiveRole = currentUser?.role || activeMembership?.role || (currentIsSystemOwner ? 'administrator' : undefined);
  const currentIsOrgAdmin = currentIsSystemOwner || activeMembership?.role === 'org-admin';
  const currentIsSupervisor = currentIsOrgAdmin || activeMembership?.role === 'supervisor';

  const saveAuth = useCallback((newAuth: AuthModel | undefined) => {
    setAuth(newAuth);
    if (newAuth) {
      authHelper.setAuth(newAuth);
    } else {
      authHelper.removeAuth();
    }
  }, []);

  const getUser = useCallback(async (isInitialBoot: boolean = false) => {
    return await SupabaseAdapter.getCurrentUser(isInitialBoot);
  }, []);

  const verify = useCallback(async (isInitialBoot: boolean = false) => {
    if (isInitialBoot) {
      setLoading(true);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = await getUser(isInitialBoot);
      
      if (!user || !session) {
        saveAuth(undefined);
        setCurrentUser(undefined);
      } else {
        if (!auth || auth.access_token !== session.access_token) {
          saveAuth({
            access_token: session.access_token,
            refresh_token: session.refresh_token || '',
          });
        }
        setCurrentUser(user);
      }
    } catch (err) {
      console.error('AuthProvider: Verification failed:', err);
      saveAuth(undefined);
      setCurrentUser(undefined);
    } finally {
      if (isInitialBoot) {
        setLoading(false);
      }
    }
  }, [auth, getUser, saveAuth]);

  // Initial session verification
  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await verify(true); 
      } else {
        saveAuth(undefined);
        setCurrentUser(undefined);
        setLoading(false);
      }
    };

    initializeAuth();
  }, [verify, saveAuth]);

  // Sync mentor/mentee status
  useEffect(() => {
    const checkPairings = async () => {
      if (currentUser?.id && activeOrgId) {
        try {
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
      }
    };

    if (currentUser?.id && activeOrgId) {
      checkPairings();
    }
  }, [currentUser?.id, activeOrgId]);

  const switchOrganisation = useCallback(async (orgId: string) => {
    setLoading(true);
    try {
      const updatedUser = await SupabaseAdapter.switchOrganisation(orgId);
      setCurrentUser(updatedUser);
      setIsMentor(false);
      setIsMentee(false);
    } catch (error) {
      console.error('Failed to switch organisation:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // AUTO-SELECTION LOGIC
  useEffect(() => {
    const autoSelect = async () => {
      if (currentUser && !activeOrgId && currentUser.memberships?.length === 1 && !hasAutoSelected.current) {
        hasAutoSelected.current = true;
        setIsAutoSelecting(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const onlyOrgId = currentUser.memberships[0].organisation_id;
        try {
          await switchOrganisation(onlyOrgId);
        } catch (error) {
          console.error('AuthProvider: Auto-selection failed:', error);
        } finally {
          setIsAutoSelecting(false);
        }
      }
    };
    
    if (!loading) {
      autoSelect();
    }
  }, [currentUser, activeOrgId, loading, switchOrganisation]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const auth = await SupabaseAdapter.login(email, password);
      saveAuth(auth);
      const user = await getUser(true);
      setCurrentUser(user || undefined);
    } catch (error) {
      saveAuth(undefined);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getUser, saveAuth]);

  const register = useCallback(async (
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
      const user = await getUser(true);
      setCurrentUser(user || undefined);
    } catch (error) {
      saveAuth(undefined);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [getUser, saveAuth]);

  const logout = useCallback(() => {
    SupabaseAdapter.logout();
    saveAuth(undefined);
    setCurrentUser(undefined);
  }, [saveAuth]);

  const updateProfile = useCallback(async (userData: Partial<UserModel>) => {
    const updatedUser = await SupabaseAdapter.updateUserProfile(userData);
    setCurrentUser(updatedUser);
    return updatedUser;
  }, []);

  const contextValue = useMemo(() => ({
    loading,
    setLoading,
    auth,
    saveAuth,
    user: currentUser,
    setUser: setCurrentUser,
    login,
    register,
    requestPasswordReset: SupabaseAdapter.requestPasswordReset,
    resetPassword: SupabaseAdapter.resetPassword,
    resendVerificationEmail: SupabaseAdapter.resendVerificationEmail,
    getUser,
    updateProfile,
    logout,
    verify,
    isAdmin: currentIsSystemOwner,
    role: effectiveRole,
    profileId: currentUser?.profile_id,
    isSystemOwner: currentIsSystemOwner,
    isOrgAdmin: currentIsOrgAdmin,
    isSupervisor: currentIsSupervisor,
    isMentor,
    isMentee,
    isAutoSelecting: isAutoSelecting,
    setIsMentor,
    setIsMentee,
    memberships: currentUser?.memberships || [],
    activeMembership,
    switchOrganisation,
  }), [
    loading, auth, currentUser, isMentor, isMentee, isAutoSelecting, 
    activeMembership, currentIsSystemOwner, effectiveRole, currentIsOrgAdmin, 
    currentIsSupervisor, login, register, getUser, updateProfile, logout, 
    verify, saveAuth, switchOrganisation
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
