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
  const [isSystemOwner, setIsSystemOwner] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [isMentee, setIsMentee] = useState(false);

  // Derived active context
  const activeMembership = currentUser?.memberships?.find(
    m => m.organisation_id === (currentUser.selected_organisation_id || currentUser.organisation_id)
  ) || currentUser?.memberships?.[0];

  // Check roles and pairings based on active context
  useEffect(() => {
    // 1. System Owner (Global Admin)
    const systemOwner = !!currentUser?.is_admin;
    setIsSystemOwner(systemOwner);
    setIsAdmin(systemOwner);

    // 2. Org Roles based on Membership
    if (activeMembership) {
      setIsOrgAdmin(activeMembership.role === 'org-admin');
      setIsSupervisor(activeMembership.role === 'supervisor' || activeMembership.role === 'org-admin');
    } else {
      setIsOrgAdmin(false);
      setIsSupervisor(false);
    }

    const checkPairings = async () => {
      if (currentUser?.id) {
        try {
          const orgId = activeMembership?.organisation_id || currentUser.organisation_id;
          
          // Check active pairings in this specific organisation
          let query = supabase
            .from('mp_pairs')
            .select('mentor_id, mentee_id', { count: 'exact', head: true })
            .eq('status', 'active');

          if (orgId) {
            query = query.eq('organisation_id', orgId);
          }

          const { count: mentorCount } = await query.eq('mentor_id', currentUser.id);
          
          // Reset query for mentee check
          let menteeQuery = supabase
            .from('mp_pairs')
            .select('mentor_id, mentee_id', { count: 'exact', head: true })
            .eq('status', 'active');
          
          if (orgId) {
            menteeQuery = menteeQuery.eq('organisation_id', orgId);
          }
          
          const { count: menteeCount } = await menteeQuery.eq('mentee_id', currentUser.id);

          setIsMentor((mentorCount || 0) > 0);
          setIsMentee((menteeCount || 0) > 0);
        } catch (error) {
          console.error('Error checking pairings:', error);
        }
      }
    };

    checkPairings();
  }, [currentUser, activeMembership]);

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
        role: activeMembership?.role || currentUser?.role,
        profileId: currentUser?.profile_id,
        isSystemOwner,
        isOrgAdmin,
        isSupervisor,
        isMentor,
        isMentee,
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
