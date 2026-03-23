import { ROLES } from '@/config/constants';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../providers/supabase-provider';
import { useAuth } from '../context/auth-context';
import { SupabaseAdapter } from '../adapters/supabase-adapter';
import { PropsWithChildren } from 'react';
import { supabase } from '@/lib/supabase';

// Mock the adapter
vi.mock('../adapters/supabase-adapter', () => ({
  SupabaseAdapter: {
    getCurrentUser: vi.fn(),
    getUserProfile: vi.fn(),
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    resendVerificationEmail: vi.fn(),
    updateUserProfile: vi.fn(),
  },
}));

// Mock Supabase client
let authStateCallback: (event: string, session: any) => Promise<void>;
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  },
}));

// Mock organisations
vi.mock('@/providers/organisation-provider', () => ({
  OrganisationProvider: ({ children }: PropsWithChildren) => <>{children}</>,
  useOrganisation: () => ({ isMasquerading: false }),
}));

// Mock auth helper
vi.mock('../lib/helpers', () => ({
  getAuth: vi.fn(() => ({ access_token: 'fake', refresh_token: 'fake' })),
  setAuth: vi.fn(),
  removeAuth: vi.fn(),
  getProfileCache: vi.fn(() => null),
  setProfileCache: vi.fn(),
}));

const wrapper = ({ children }: PropsWithChildren) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthProvider Single-Organisation Role Derivation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks
    vi.mocked(SupabaseAdapter.getCurrentUser).mockResolvedValue(null);
    vi.mocked(SupabaseAdapter.getUserProfile).mockResolvedValue(null as any);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    });
  });

  it('derives roles correctly for an administrator', async () => {
    const mockUser = {
      id: 'admin-1',
      role: ROLES.ADMINISTRATOR,
    };
    vi.mocked(SupabaseAdapter.getUserProfile).mockResolvedValue(mockUser as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      if (authStateCallback) {
        await authStateCallback('SIGNED_IN', { 
          user: { id: 'admin-1' }, 
          access_token: 'fake', 
          refresh_token: 'fake' 
        });
      }
    });

    await waitFor(() => {
      expect(result.current.role).toBe(ROLES.ADMINISTRATOR);
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isOrgAdmin).toBe(true);
      expect(result.current.isSupervisor).toBe(true);
    });
  });

  it('derives roles correctly for a supervisor', async () => {
    const mockUser = {
      id: 'supervisor-1',
      role: ROLES.SUPERVISOR,
    };
    vi.mocked(SupabaseAdapter.getUserProfile).mockResolvedValue(mockUser as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      if (authStateCallback) {
        await authStateCallback('SIGNED_IN', { 
          user: { id: 'supervisor-1' }, 
          access_token: 'fake', 
          refresh_token: 'fake' 
        });
      }
    });

    await waitFor(() => {
      expect(result.current.role).toBe(ROLES.SUPERVISOR);
      expect(result.current.isSupervisor).toBe(true);
      expect(result.current.isAdmin).toBe(false);
    });
  });

  it('derives roles correctly for a program-member', async () => {
    const mockUser = {
      id: 'member-1',
      role: ROLES.PROGRAM_MEMBER,
    };
    vi.mocked(SupabaseAdapter.getUserProfile).mockResolvedValue(mockUser as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      if (authStateCallback) {
        await authStateCallback('SIGNED_IN', { 
          user: { id: 'member-1' }, 
          access_token: 'fake', 
          refresh_token: 'fake' 
        });
      }
    });

    await waitFor(() => {
      expect(result.current.role).toBe(ROLES.PROGRAM_MEMBER);
      expect(result.current.isSupervisor).toBe(false);
      expect(result.current.isAdmin).toBe(false);
    });
  });
});
