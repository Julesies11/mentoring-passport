import { PropsWithChildren, useEffect, useState, useCallback, useMemo } from 'react';
import { SupabaseAdapter } from '@/auth/adapters/supabase-adapter';
import { AuthContext } from '@/auth/context/auth-context';
import { supabase } from '@/lib/supabase';
import { AuthModel, UserModel } from '@/auth/lib/models';
import * as authHelper from '@/auth/lib/helpers';
import { logDebug } from '@/lib/logger';

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth());
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>();
  const [isMentor, setIsMentor] = useState(false);
  const [isMentee, setIsMentee] = useState(false);

  const effectiveRole = currentUser?.role;
  const isSysAdmin = effectiveRole === 'administrator';
  const isOrgAdmin = effectiveRole === 'org-admin';
  const isSupervisor = effectiveRole === 'supervisor';
  const isProgramMember = effectiveRole === 'program-member';

  const saveAuth = useCallback((newAuth: AuthModel | undefined) => {
    setAuth(newAuth);
    if (newAuth) {
      authHelper.setAuth(newAuth);
    } else {
      authHelper.removeAuth();
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // We rely entirely on the onAuthStateChange listener to get the initial session
    // This prevents the dreaded getSession() lock/deadlock in React Strict Mode.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: onAuthStateChange event:', event, 'Session exists:', !!session);
      logDebug('AuthProvider: onAuthStateChange event:', event);

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session && mounted) {
          saveAuth({
            access_token: session.access_token,
            refresh_token: session.refresh_token || '',
          });
          
          try {
             // We pass the user object directly from the session to avoid another network call
             const user = await SupabaseAdapter.getUserProfile(session.user);
             if (mounted) setCurrentUser(user || undefined);
          } catch (err) {
             console.error('AuthProvider: Failed to fetch profile on auth event', err);
             if (mounted) setCurrentUser(undefined);
          }
        } else if (!session && mounted) {
          saveAuth(undefined);
          setCurrentUser(undefined);
        }
        
        // Once we get our first event (even if session is null), we are no longer loading
        if (mounted) {
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          saveAuth(undefined);
          setCurrentUser(undefined);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [saveAuth]);

  const verify = useCallback(async (isInitialBoot: boolean = false) => {
    // This function is now mostly a no-op because the reactivity handles it.
    // We keep it for interface compatibility.
    logDebug('AuthProvider: verify called (now handled by reactivity)');
  }, []);

  useEffect(() => {
    const checkPairings = async () => {
      console.log('AuthProvider: checkPairings started');
      if (currentUser?.id) {
        try {
          console.log('AuthProvider: Fetching pairings for user:', currentUser.id);
          
          const fetchPromise = Promise.all([
            supabase
              .from('mp_pairs')
              .select('*', { count: 'exact', head: true })
              .eq('mentor_id', currentUser.id)
              .eq('status', 'active'),
            supabase
              .from('mp_pairs')
              .select('*', { count: 'exact', head: true })
              .eq('mentee_id', currentUser.id)
              .eq('status', 'active')
          ]);

          const timeoutPromise = new Promise<any[]>((resolve) => 
            setTimeout(() => {
              console.warn('AuthProvider: Pairings fetch timed out after 15s');
              resolve([{ count: 0 }, { count: 0 }]); // Fallback to 0 counts
            }, 15000)
          );

          const [mentorRes, menteeRes] = await Promise.race([fetchPromise, timeoutPromise]);

          console.log('AuthProvider: checkPairings completed');
          setIsMentor((mentorRes.count || 0) > 0);
          setIsMentee((menteeRes.count || 0) > 0);
        } catch (error) {
          console.error('AuthProvider: Error checking pairings:', error);
          setIsMentor(false);
          setIsMentee(false);
        }
      } else {
         console.log('AuthProvider: checkPairings skipped (no user)');
         setIsMentor(false);
         setIsMentee(false);
      }
    };

    checkPairings();
  }, [currentUser?.id]);

  const login = useCallback(async (email: string, password: string): Promise<UserModel | undefined> => {
    setLoading(true);
    try {
      const auth = await SupabaseAdapter.login(email, password);
      saveAuth(auth);
      // We don't manually fetch user here anymore, onAuthStateChange handles it
      return undefined;
    } catch (error) {
      saveAuth(undefined);
      throw error;
    } finally {
      // Don't set loading to false here, onAuthStateChange will do it when profile is ready
    }
  }, [saveAuth]);

  const logout = useCallback(async () => {
    setLoading(true);
    await SupabaseAdapter.logout();
    saveAuth(undefined);
    setCurrentUser(undefined);
    setLoading(false);
  }, [saveAuth]);

  const contextValue = useMemo(() => ({
    loading,
    setLoading,
    auth,
    saveAuth,
    user: currentUser,
    setUser: setCurrentUser,
    login,
    register: SupabaseAdapter.register,
    requestPasswordReset: SupabaseAdapter.requestPasswordReset,
    resetPassword: SupabaseAdapter.resetPassword,
    resendVerificationEmail: SupabaseAdapter.resendVerificationEmail,
    getUser: SupabaseAdapter.getCurrentUser,
    updateProfile: SupabaseAdapter.updateUserProfile,
    logout,
    verify,
    role: effectiveRole,
    profileId: currentUser?.id,
    isSysAdmin,
    isOrgAdmin,
    isSupervisor,
    isProgramMember,
    isMentor,
    isMentee,
    setIsMentor,
    setIsMentee,
  }), [
    loading, auth, currentUser, isMentor, isMentee, 
    effectiveRole, isSupervisor, isSysAdmin, isOrgAdmin, isProgramMember, login, logout, verify, saveAuth
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}