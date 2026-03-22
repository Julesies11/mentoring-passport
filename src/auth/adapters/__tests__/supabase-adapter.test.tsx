import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseAdapter } from '../supabase-adapter';
import { supabase } from '@/lib/supabase';
import * as authHelpers from '@/auth/lib/helpers';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn(),
  },
}));

// Mock auth helpers
vi.mock('@/auth/lib/helpers', () => ({
  getProfileCache: vi.fn(),
  setProfileCache: vi.fn(),
}));

describe('SupabaseAdapter', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User' },
    app_metadata: { role: 'supervisor' },
  };

  const mockProfile = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User Profile',
    role: 'supervisor',
    status: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe('getUserProfile', () => {
    it('deduplicates parallel requests', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: mockUser }, error: null } as any);
      
      // Slow database response
      let resolveDatabase: any;
      const dbPromise = new Promise((resolve) => {
        resolveDatabase = resolve;
      });
      vi.mocked(supabase.maybeSingle).mockReturnValue(dbPromise as any);

      // Fire two requests in parallel
      const promise1 = SupabaseAdapter.getUserProfile(mockUser);
      const promise2 = SupabaseAdapter.getUserProfile(mockUser);

      // Verify only one database call was initiated
      expect(supabase.from).toHaveBeenCalledTimes(1);

      // Resolve the database call
      resolveDatabase({ data: mockProfile, error: null });

      const [user1, user2] = await Promise.all([promise1, promise2]);

      expect(user1.id).toBe('user-123');
      expect(user1).toEqual(user2);
      expect(authHelpers.setProfileCache).toHaveBeenCalledWith(user1);
    });

    it('uses cache as fallback on timeout', async () => {
      const cachedUser = { id: 'user-123', full_name: 'Cached User', role: 'supervisor' };
      vi.mocked(authHelpers.getProfileCache).mockReturnValue(cachedUser as any);
      
      // Database never responds
      vi.mocked(supabase.maybeSingle).mockReturnValue(new Promise(() => {}) as any);

      const profilePromise = SupabaseAdapter.getUserProfile(mockUser);

      // Fast forward 5 seconds (the timeout for cached users)
      await vi.advanceTimersByTimeAsync(5001);

      const result = await profilePromise;

      expect(result.full_name).toBe('Cached User');
      expect(result.id).toBe('user-123');
    });

    it('clears timeout when database responds quickly', async () => {
      vi.mocked(supabase.maybeSingle).mockResolvedValue({ data: mockProfile, error: null } as any);
      
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      await SupabaseAdapter.getUserProfile(mockUser);
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(authHelpers.setProfileCache).toHaveBeenCalled();
    });

    it('handles missing profile by falling back to auth metadata', async () => {
      vi.mocked(authHelpers.getProfileCache).mockReturnValue(null as any);
      vi.mocked(supabase.maybeSingle).mockResolvedValue({ data: null, error: null } as any);
      
      const result = await SupabaseAdapter.getUserProfile(mockUser);
      
      expect(result.id).toBe('user-123');
      expect(result.full_name).toBe('Test User'); // From user_metadata
      expect(result.role).toBe('supervisor'); // From app_metadata
    });
  });
});
