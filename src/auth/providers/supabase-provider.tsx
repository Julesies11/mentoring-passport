import { PropsWithChildren, useEffect, useState } from 'react';
import { SupabaseAdapter } from '@/auth/adapters/supabase-adapter';
import { AuthContext } from '@/auth/context/auth-context';
import { supabase } from '@/lib/supabase';
import * as authHelper from '@/auth/lib/helpers';
import { AuthModel, UserModel } from '@/auth/lib/models';

// Define the Supabase Auth Provider
export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth());
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [isMentee, setIsMentee] = useState(false);

  // Check if user is admin and their active pairings
  useEffect(() => {
    setIsAdmin(currentUser?.is_admin === true);

    const checkPairings = async () => {
      if (currentUser?.id) {
        try {
          // Check if user is a mentor in any pair
          const { count: mentorCount } = await supabase
            .from('mp_pairs')
            .select('*', { count: 'exact', head: true })
            .eq('mentor_id', currentUser.id)
            .eq('status', 'active');
          
          // Check if user is a mentee in any pair
          const { count: menteeCount } = await supabase
            .from('mp_pairs')
            .select('*', { count: 'exact', head: true })
            .eq('mentee_id', currentUser.id)
            .eq('status', 'active');

          const mentorExists = (mentorCount || 0) > 0;
          const menteeExists = (menteeCount || 0) > 0;

          // Only update if values changed
          setIsMentor(prev => prev !== mentorExists ? mentorExists : prev);
          setIsMentee(prev => prev !== menteeExists ? menteeExists : prev);
        } catch (error) {
          console.error('Error checking pairings:', error);
        }
      } else {
        setIsMentor(false);
        setIsMentee(false);
      }
    };

    checkPairings();
  }, [currentUser]);

  const verify = async () => {
    if (auth) {
      try {
        const user = await getUser();
        setCurrentUser(user || undefined);
      } catch {
        saveAuth(undefined);
        setCurrentUser(undefined);
      }
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
    try {
      const auth = await SupabaseAdapter.login(email, password);
      saveAuth(auth);
      const user = await getUser();
      setCurrentUser(user || undefined);
    } catch (error) {
      saveAuth(undefined);
      throw error;
    }
  };

  const register = async (
    email: string,
    password: string,
    password_confirmation: string,
    firstName?: string,
    lastName?: string,
  ) => {
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
        isAdmin,
        // Mentoring Passport role helpers
        role: currentUser?.role,
        profileId: currentUser?.profile_id,
        isSupervisor: currentUser?.role === 'supervisor',
        isMentor,
        isMentee,
        setIsMentor,
        setIsMentee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
