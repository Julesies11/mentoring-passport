import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../providers/supabase-provider';
import { useAuth } from '../context/auth-context';
import { SupabaseAdapter } from '../adapters/supabase-adapter';
import { PropsWithChildren } from 'react';

// Mock the adapter
vi.mock('../adapters/supabase-adapter', () => ({
  SupabaseAdapter: {
    getCurrentUser: vi.fn(),
    switchOrganisation: vi.fn(),
  },
}));

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
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

describe('AuthProvider Role Derivation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for getCurrentUser
    vi.mocked(SupabaseAdapter.getCurrentUser).mockResolvedValue(null);
  });

  it('derives roles correctly for a global administrator', async () => {
    const mockUser = {
      id: 'u1',
      is_admin: true,
      role: 'administrator',
      memberships: []
    };
    vi.mocked(SupabaseAdapter.getCurrentUser).mockResolvedValue(mockUser as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Manually trigger verify and loading finish as AppRouting would
    await act(async () => {
      await result.current.verify();
      result.current.setLoading(false);
    });

    await waitFor(() => {
      expect(result.current.isSystemOwner).toBe(true);
      expect(result.current.role).toBe('administrator');
    });
  });

  it('derives roles correctly for an Org Admin', async () => {
    const mockUser = {
      id: 'u2',
      is_admin: false,
      role: 'program-member',
      memberships: [
        { organisation_id: 'org1', role: 'org-admin', status: 'active' }
      ],
      organisation_id: 'org1'
    };
    vi.mocked(SupabaseAdapter.getCurrentUser).mockResolvedValue(mockUser as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.verify();
      result.current.setLoading(false);
    });

    await waitFor(() => {
      expect(result.current.isOrgAdmin).toBe(true);
      expect(result.current.isSystemOwner).toBe(false);
      expect(result.current.isSupervisor).toBe(true); 
      expect(result.current.role).toBe('org-admin');
    });
  });

  it('derives roles correctly for a regular Supervisor', async () => {
    const mockUser = {
      id: 'u3',
      is_admin: false,
      memberships: [
        { organisation_id: 'org1', role: 'supervisor', status: 'active' }
      ],
      organisation_id: 'org1'
    };
    vi.mocked(SupabaseAdapter.getCurrentUser).mockResolvedValue(mockUser as any);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.verify();
      result.current.setLoading(false);
    });

    await waitFor(() => {
      expect(result.current.isSupervisor).toBe(true);
      expect(result.current.isOrgAdmin).toBe(false);
      expect(result.current.role).toBe('supervisor');
    });
  });
});
