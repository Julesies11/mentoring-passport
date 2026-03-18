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
  },
}));

// Mock Supabase client
let authStateCallback: (event: string, session: any) => void;
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
}));

const wrapper = ({ children }: PropsWithChildren) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthProvider Single-Organisation Role Derivation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for getCurrentUser
    vi.mocked(SupabaseAdapter.getCurrentUser).mockResolvedValue(null);
    vi.mocked(SupabaseAdapter.getUserProfile).mockResolvedValue(null);
    // Default mock for getSession
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    });
  });

  it('derives roles correctly for an administrator', async () => {
    const mockUser = {
      id: 'admin-1',
      role: 'administrator',
    };
    vi.mocked(SupabaseAdapter.getUserProfile).mockResolvedValue(mockUser as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', { user: { id: 'admin-1' }, access_token: 'fake', refresh_token: 'fake' });
      }
    });

    await waitFor(() => {
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isOrgAdmin).toBe(true); // administrator is also an org admin
      expect(result.current.isSupervisor).toBe(true);
      expect(result.current.role).toBe('administrator');
    });
  });

  it('derives roles correctly for a supervisor', async () => {
    const mockUser = {
      id: 'supervisor-1',
      role: 'supervisor',
    };
    vi.mocked(SupabaseAdapter.getUserProfile).mockResolvedValue(mockUser as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', { user: { id: 'supervisor-1' }, access_token: 'fake', refresh_token: 'fake' });
      }
    });

    await waitFor(() => {
      expect(result.current.isSupervisor).toBe(true);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.role).toBe('supervisor');
    });
  });

  it('derives roles correctly for a program-member', async () => {
    const mockUser = {
      id: 'member-1',
      role: 'program-member',
    };
    vi.mocked(SupabaseAdapter.getUserProfile).mockResolvedValue(mockUser as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      if (authStateCallback) {
        authStateCallback('SIGNED_IN', { user: { id: 'member-1' }, access_token: 'fake', refresh_token: 'fake' });
      }
    });

    await waitFor(() => {
      expect(result.current.role).toBe('program-member');
      expect(result.current.isSupervisor).toBe(false);
      expect(result.current.isAdmin).toBe(false);
    });
  });
});
