import { AuthModel, UserModel } from '@/auth/lib/models';
import { supabase } from '@/lib/supabase';

/**
 * Supabase adapter that maintains the same interface as the existing auth flow
 * but uses Supabase under the hood.
 */
export const SupabaseAdapter = {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthModel> {
    if (import.meta.env.DEV) console.log('SupabaseAdapter: Attempting login with email:', email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('SupabaseAdapter: Login error from Supabase:', error);
        throw new Error(error.message);
      }

      if (import.meta.env.DEV) console.log(
        'SupabaseAdapter: Login successful, session:',
        data.session
          ? {
              access_token_length: data.session.access_token?.length,
              refresh_token_length: data.session.refresh_token?.length,
            }
          : 'No session data',
      );

      // Transform Supabase session to AuthModel
      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      };
    } catch (error) {
      console.error('SupabaseAdapter: Unexpected login error:', error);
      throw error;
    }
  },

  /**
   * Login with OAuth provider (Google, GitHub, etc.)
   */
  async signInWithOAuth(
    provider:
      | 'google'
      | 'github'
      | 'facebook'
      | 'twitter'
      | 'discord'
      | 'slack',
    options?: { redirectTo?: string },
  ): Promise<void> {
    if (import.meta.env.DEV) console.log(
      'SupabaseAdapter: Initiating OAuth flow with provider:',
      provider,
    );

    try {
      const redirectTo =
        options?.redirectTo || `${window.location.origin}/auth/callback`;

      if (import.meta.env.DEV) console.log('SupabaseAdapter: Using redirect URL:', redirectTo);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error('SupabaseAdapter: OAuth error:', error);
        throw new Error(error.message);
      }

      if (import.meta.env.DEV) console.log('SupabaseAdapter: OAuth flow initiated successfully');

      // No need to return anything - the browser will be redirected
    } catch (error) {
      console.error('SupabaseAdapter: Unexpected OAuth error:', error);
      throw error;
    }
  },

  /**
   * Register a new user
   */
  async register(
    email: string,
    password: string,
    password_confirmation: string,
    firstName?: string,
    lastName?: string,
    organisationId?: string,
  ): Promise<AuthModel> {
    if (password !== password_confirmation) {
      throw new Error('Passwords do not match');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: email.split('@')[0], // Default username from email
          first_name: firstName || '',
          last_name: lastName || '',
          full_name:
            firstName && lastName ? `${firstName} ${lastName}`.trim() : '',
          organisation_id: organisationId,
          created_at: new Date().toISOString(),
        },
      },
    });

    if (error) throw new Error(error.message);

    // Return empty tokens if email confirmation is required
    if (!data.session) {
      return {
        access_token: '',
        refresh_token: '',
      };
    }

    // Transform Supabase session to AuthModel
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  },

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    if (import.meta.env.DEV) console.log('Requesting password reset for:', email);

    try {
      // Ensure the redirect URL is properly formatted with a hash for token
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      if (import.meta.env.DEV) console.log('Using redirect URL:', redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset request error:', error);
        throw new Error(error.message);
      }

      if (import.meta.env.DEV) console.log('Password reset email sent successfully');
    } catch (err) {
      console.error('Unexpected error in password reset:', err);
      throw err;
    }
  },

  /**
   * Reset password with token
   */
  async resetPassword(
    password: string,
    password_confirmation: string,
  ): Promise<void> {
    if (password !== password_confirmation) {
      throw new Error('Passwords do not match');
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) throw new Error(error.message);
  },

  /**
   * Request another verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/verify-email`,
      },
    });

    if (error) throw new Error(error.message);
  },

  /**
   * Get current user from the session
   */
  async getCurrentUser(): Promise<UserModel | null> {
    // Check if there is a local session first to prevent unnecessary 403 network errors
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return null;

      return await this.getUserProfile(data.user);
    } catch (_e) {
      return null;
    }
  },

  /**
   * Get user profile from mp_profiles table
   */
  async getUserProfile(preFetchedUser?: any): Promise<UserModel> {
    let user = preFetchedUser;

    if (!user) {
      const {
        data: authData,
        error,
      } = await supabase.auth.getUser();

      if (error || !authData.user) throw new Error(error?.message || 'User not found');
      user = authData.user;
    }

    // Fetch profile data from mp_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('mp_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error(profileError?.message || 'Profile not found');
    }

    // Get user metadata for backward compatibility
    const metadata = user.user_metadata || {};

    // Format data combining auth.users and mp_profiles
    return {
      id: user.id,
      profile_id: user.id,
      email: user.email || profile.email || '',
      email_verified: user.email_confirmed_at !== null,
      username: metadata.username || user.email?.split('@')[0] || '',
      first_name: metadata.first_name || '',
      last_name: metadata.last_name || '',
      fullname: metadata.fullname || profile.full_name || '',
      full_name: profile.full_name || '',
      occupation: metadata.occupation || '',
      company_name: metadata.company_name || '',
      phone: profile.phone || metadata.phone || '',
      roles: metadata.roles || [],
      pic: profile.avatar_url || metadata.pic || '',
      language: metadata.language || 'en',
      is_admin: profile.role === 'supervisor',
      
      // Mentoring Passport specific fields from mp_profiles
      role: profile.role as any, // Cast due to type transition
      job_title: profile.job_title || metadata.job_title || '',
      avatar_url: profile.avatar_url,
      department: profile.department,
      bio: profile.bio,
      status: profile.status,
      organisation_id: profile.organisation_id,
      must_change_password: profile.must_change_password,
    };
  },

  /**
   * Update user profile (stored in metadata AND mp_profiles table)
   */
  async updateUserProfile(userData: Partial<UserModel>): Promise<UserModel> {
    // 1. Transform from UserModel to metadata format for auth.users
    const metadata: Record<string, unknown> = {
      username: userData.username,
      first_name: userData.first_name,
      last_name: userData.last_name,
      fullname:
        userData.fullname ||
        userData.full_name ||
        `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
      occupation: userData.occupation,
      company_name: userData.company_name,
      phone: userData.phone,
      roles: userData.roles,
      pic: userData.avatar_url !== undefined ? userData.avatar_url : userData.pic,
      language: userData.language,
      is_admin: userData.is_admin,
      updated_at: new Date().toISOString(),
    };

    // Remove undefined fields
    Object.keys(metadata).forEach((key) => {
      if (metadata[key] === undefined) {
        delete metadata[key];
      }
    });

    // Update user metadata in auth.users
    const { error: authError } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (authError) throw new Error(authError.message);

    // 2. Update mp_profiles table
    const profileUpdate: Record<string, any> = {};
    if (userData.full_name !== undefined) profileUpdate.full_name = userData.full_name;
    if (userData.job_title !== undefined) profileUpdate.job_title = userData.job_title;
    if (userData.bio !== undefined) profileUpdate.bio = userData.bio;
    if (userData.department !== undefined) profileUpdate.department = userData.department;
    if (userData.phone !== undefined) profileUpdate.phone = userData.phone;
    if (userData.avatar_url !== undefined) profileUpdate.avatar_url = userData.avatar_url;

    if (Object.keys(profileUpdate).length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('mp_profiles')
          .update(profileUpdate)
          .eq('id', user.id);
        
        if (profileError) throw new Error(profileError.message);
      }
    }

    return (await this.getCurrentUser()) as UserModel;
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },
};
