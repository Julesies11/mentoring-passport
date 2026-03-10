import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganisationProvider, useOrganisation } from '../organisation-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as programsApi from '@/lib/api/programs';
import * as orgsApi from '@/lib/api/organisations';
import { AuthContext } from '@/auth/context/auth-context';

vi.mock('@/lib/api/programs', () => ({
  fetchPrograms: vi.fn(),
}));

vi.mock('@/lib/api/organisations', () => ({
  fetchOrganisation: vi.fn(),
}));

const mockUser = {
  id: 'u1',
  organisation_id: 'org1',
  role: 'supervisor'
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={{ user: mockUser, loading: false } as any}>
      <QueryClientProvider client={queryClient}>
        <OrganisationProvider>{children}</OrganisationProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
};

describe('OrganisationProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sorts programs correctly: active first, then latest start date', async () => {
    const mockPrograms = [
      { id: 'p1', status: 'inactive', start_date: '2025-01-01', name: 'Old Inactive', created_at: '2025-01-01' },
      { id: 'p2', status: 'active', start_date: '2025-02-01', name: 'Newer Active', created_at: '2025-02-01' },
      { id: 'p3', status: 'active', start_date: '2025-01-15', name: 'Older Active', created_at: '2025-01-15' },
    ];

    vi.mocked(programsApi.fetchPrograms).mockResolvedValue(mockPrograms as any);
    vi.mocked(orgsApi.fetchOrganisation).mockResolvedValue({ id: 'org1', name: 'Test Org' } as any);

    const { result } = renderHook(() => useOrganisation(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // p2 (active, Feb), p3 (active, Jan), p1 (inactive)
    expect(result.current.programs[0].id).toBe('p2');
    expect(result.current.programs[1].id).toBe('p3');
    expect(result.current.programs[2].id).toBe('p1');
    
    // Default active program should be the top one
    expect(result.current.activeProgram?.id).toBe('p2');
  });

  it('updates active program when setActiveProgram is called', async () => {
    const mockPrograms = [
      { id: 'p1', status: 'active', start_date: '2025-01-01', name: 'P1' },
      { id: 'p2', status: 'inactive', start_date: '2025-02-01', name: 'P2' },
    ];

    vi.mocked(programsApi.fetchPrograms).mockResolvedValue(mockPrograms as any);

    const { result } = renderHook(() => useOrganisation(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeProgram?.id).toBe('p1');

    await act(async () => {
      result.current.setActiveProgram('p2');
    });

    expect(result.current.activeProgram?.id).toBe('p2');
  });
});
