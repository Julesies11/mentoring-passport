import { AuthModel, UserModel } from '@/auth/lib/models';
import { supabase } from '@/lib/supabase';
import { logDebug } from '@/lib/logger';
import { getProfileCache, setProfileCache } from '@/auth/lib/helpers';

// Simple in-memory deduplication for profile requests
const pendingPromises = new Map<string, Promise<UserModel>>();

/**
 * Supabase adapter that maintains the same interface as the existing auth flow
 * but uses Supabase under the hood.
 */
export const SupabaseAdapter = {
  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthModel> {
    logDebug('SupabaseAdapter: Attempting login with email:', email);

    try {
      logDebug('SupabaseAdapter: Calling supabase.auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logDebug('SupabaseAdapter: Login error returned from Supabase:', error.message);
        console.error('SupabaseAdapter: Login error from Supabase:', error);
        throw new Error(error.message);
      }

      logDebug(
        'SupabaseAdapter: Login successful, session received:',
        data.session ? 'YES' : 'NO'
      );

      if (!data.session) {
        throw new Error('Login succeeded but no session was returned');
      }

      // Transform Supabase session to AuthModel
      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      };
    } catch (error) {
      logDebug('SupabaseAdapter: Unexpected login error caught:', error instanceof Error ? error.message : String(error));
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

      logDebug('SupabaseAdapter: Using redirect URL:', redirectTo);

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

      logDebug('SupabaseAdapter: OAuth flow initiated successfully');

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
    logDebug('Requesting password reset for:', email);

    try {
      // Ensure the redirect URL is properly formatted with a hash for token
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      logDebug('Using redirect URL:', redirectUrl);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset request error:', error);
        throw new Error(error.message);
      }

      logDebug('Password reset email sent successfully');
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
    console.log('SupabaseAdapter: getCurrentUser started');
    try {
      // We skip getSession() here because it's been known to hang in some Vite/StrictMode setups.
      // getUser() is sufficient to verify authentication.
      console.log('SupabaseAdapter: Calling supabase.auth.getUser()');
      const { data, error } = await supabase.auth.getUser();
      
      console.log('SupabaseAdapter: supabase.auth.getUser() returned. User exists:', !!data?.user);

      if (error || !data.user) {
        logDebug('SupabaseAdapter: Auth session invalid or user missing', error);
        return null;
      }

      console.log('SupabaseAdapter: Fetching database profile for user:', data.user.id);
      const profile = await this.getUserProfile(data.user);
      console.log('SupabaseAdapter: Database profile fetched successfully');
      
      return profile;
    } catch (e) {
      console.error('SupabaseAdapter: Failed to get current user complete profile:', e);
      return null;
    }
  },

  /**
   * Get user profile from mp_profiles table
   */
  async getUserProfile(preFetchedUser?: any): Promise<UserModel> {
    let user = preFetchedUser;

    if (!user) {
      console.log('SupabaseAdapter: No preFetchedUser, calling supabase.auth.getUser()');
      const {
        data: authData,
        error,
      } = await supabase.auth.getUser();

      if (error || !authData.user) throw new Error(error?.message || 'User not found');
      user = authData.user;
    }

    const userId = user.id;

    // Check for an in-flight request for this user ID to prevent redundant calls
    if (pendingPromises.has(userId)) {
      logDebug('SupabaseAdapter: Returning existing pending promise for user:', userId);
      return pendingPromises.get(userId)!;
    }

    // Use a fresh promise if none is in-flight
    const profilePromise = (async () => {
      try {
        // Step 1: Check cache immediately (SWR - Stale-While-Revalidate)
        const cached = getProfileCache();
        const hasValidCache = cached && cached.id === userId;
        
        if (hasValidCache) {
          logDebug('SupabaseAdapter: Found cached profile for user:', userId);
        }

        console.log('SupabaseAdapter: Fetching profile data from mp_profiles for ID:', userId);
        
        // Step 2: Set a timeout for the network request
        // If we have a cache, we can afford a shorter timeout (5s) for a better UX
        const timeoutDuration = hasValidCache ? 5000 : 15000;
        
        const fetchPromise = supabase
          .from('mp_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
          
        let timeoutId: any;
        const timeoutPromise = new Promise<any>((resolve) => {
          timeoutId = setTimeout(() => resolve({ 
            data: null, 
            error: { message: 'Profile database fetch timeout', isTimeout: true } 
          }), timeoutDuration);
        });
        
        const result = await Promise.race([fetchPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        
        const { data: profile, error: profileError } = result;

        let usedFallback = false;
        if (profileError) {
          if (profileError.isTimeout) {
            console.error(`SupabaseAdapter: Profile database fetch timed out after ${timeoutDuration/1000}s.`);
            usedFallback = true;
          } else {
            console.warn('SupabaseAdapter: Could not fetch profile from mp_profiles table.', profileError);
            usedFallback = true;
          }
        } else if (profile) {
          logDebug('SupabaseAdapter: Profile data fetched successfully');
        } else {
          logDebug('SupabaseAdapter: No profile record found in mp_profiles');
          usedFallback = true;
        }

        // If we failed to get fresh data, but we have a cache, USE THE CACHE
        if (usedFallback && hasValidCache) {
          logDebug('SupabaseAdapter: Using cached profile as fallback');
          return cached;
        }

        const metadata = user.user_metadata || {};
        const appMetadata = user.app_metadata || {};

        // The role in app_metadata is our source of truth for RLS
        const userRole = appMetadata.role || profile?.role || metadata.role || 'program-member';

        // Format final user model
        const userModel: UserModel = {
          id: user.id,
          profile_id: user.id,
          email: user.email || profile?.email || '',
          email_verified: user.email_confirmed_at !== null,
          username: metadata.username || user.email?.split('@')[0] || '',
          first_name: metadata.first_name || '',
          last_name: metadata.last_name || '',
          fullname: profile?.full_name || metadata.full_name || '',
          full_name: profile?.full_name || metadata.full_name || '',
          phone: profile?.phone || '',
          pic: profile?.avatar_url || metadata.avatar_url || '',
          avatar_url: profile?.avatar_url || metadata.avatar_url || '',
          language: metadata.language || 'en',

          // Instance specific fields
          role: userRole as any,
          job_title_id: profile?.job_title_id || '',
          status: profile?.status || 'active',
          must_change_password: profile?.must_change_password ?? false,
          bio: profile?.bio || '',
        };

        // Update cache for next time
        if (profile) {
          setProfileCache(userModel);
        }

        return userModel;
      } finally {
        // Clean up pending promise map when finished
        pendingPromises.delete(userId);
      }
    })();

    pendingPromises.set(userId, profilePromise);
    return profilePromise;
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  /**
   * Update user profile in mp_profiles table
   */
  async updateUserProfile(userData: Partial<UserModel>): Promise<UserModel | undefined> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Filter out non-profile fields for the database update
      const { full_name, phone, bio, avatar_url, job_title_id, department } = userData;
      
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (full_name !== undefined) updateData.full_name = full_name;
      if (phone !== undefined) updateData.phone = phone;
      if (bio !== undefined) updateData.bio = bio;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      if (job_title_id !== undefined) updateData.job_title_id = job_title_id;
      if (department !== undefined) updateData.department = department;

      const { data: profile, error } = await supabase
        .from('mp_profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      // Invalidate cache since we updated the data
      // (This will force a refresh on the next getUserProfile call)
      
      // Return refreshed complete profile
      return await this.getUserProfile(user);
    } catch (e) {
      console.error('SupabaseAdapter: Error updating profile:', e);
      throw e;
    }
  },
};
