import { PAIR_STATUS } from '@/config/constants';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePairs } from '../use-pairs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as pairsApi from '@/lib/api/pairs';

// Mock useOrganisation
vi.mock('@/providers/organisation-provider', () => ({
  useOrganisation: vi.fn(() => ({
    activeProgram: { id: 'prog1' },
    isLoading: false
  })),
}));

// Mock the API layer
vi.mock('@/lib/api/pairs', () => ({
  fetchPairs: vi.fn(),
  fetchPairStats: vi.fn(),
  createPair: vi.fn(),
  updatePair: vi.fn(),
  archivePair: vi.fn(),
  restorePair: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePairs Single-Organisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches pairs correctly without organisation filters', async () => {
    const mockPairs = [{ id: 'p1', status: PAIR_STATUS.ACTIVE }];
    vi.mocked(pairsApi.fetchPairs).mockResolvedValue(mockPairs as any);
    vi.mocked(pairsApi.fetchPairStats).mockResolvedValue({ total: 1 } as any);

    const { result } = renderHook(() => usePairs(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.pairs).toEqual(mockPairs);
    expect(pairsApi.fetchPairs).toHaveBeenCalledWith('prog1');
  });

  it('handles create pair mutation', async () => {
    const newPair = { mentor_id: 'm1', mentee_id: 'e1' };
    vi.mocked(pairsApi.createPair).mockResolvedValue({ id: 'p2', ...newPair } as any);

    const { result } = renderHook(() => usePairs(), { wrapper: createWrapper() });

    await result.current.createPairAsync(newPair);

    expect(pairsApi.createPair).toHaveBeenCalledWith(
      expect.objectContaining({ ...newPair, program_id: 'prog1' })
    );
  });
});
