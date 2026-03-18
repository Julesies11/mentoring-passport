import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PairingProvider, usePairing } from '../pairing-provider';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { ReactNode } from 'react';

// Mock hooks
vi.mock('@/auth/context/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/hooks/use-pairs', () => ({
  useUserPairs: vi.fn(),
}));

describe('PairingProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <PairingProvider>{children}</PairingProvider>
  );

  it('throws error if usePairing is used outside provider', () => {
    // Suppress console.error for the expected throw
    const originalError = console.error;
    console.error = vi.fn();
    
    expect(() => {
      renderHook(() => usePairing());
    }).toThrow('usePairing must be used within a PairingProvider');
    
    console.error = originalError;
  });

  it('provides default values when loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1' },
      loading: true,
      isAutoSelecting: false,
    } as any);

    vi.mocked(useUserPairs).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    const { result } = renderHook(() => usePairing(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.pairings).toEqual([]);
    expect(result.current.selectedPairingId).toBeNull();
  });

  it('sorts pairings correctly (Active Status > Latest Program > Name)', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'mentor1' },
      loading: false,
      isAutoSelecting: false,
    } as any);

    const mockPairings = [
      {
        id: 'p1',
        status: 'archived',
        mentor_id: 'mentor1',
        mentee: { full_name: 'Mentee A' },
        program: { status: 'active', start_date: '2023-01-01' },
      },
      {
        id: 'p2',
        status: 'active',
        mentor_id: 'mentor1',
        mentee: { full_name: 'Mentee Z' },
        program: { status: 'active', start_date: '2023-05-01' },
      },
      {
        id: 'p3',
        status: 'active',
        mentor_id: 'mentor1',
        mentee: { full_name: 'Mentee B' },
        program: { status: 'active', start_date: '2023-10-01' },
      },
      {
        id: 'p4',
        status: 'active',
        mentor_id: 'mentor2', // user is mentee
        mentor: { full_name: 'Mentor C' },
        program: { status: 'active', start_date: '2023-10-01' }, // Same date as p3
      }
    ];

    vi.mocked(useUserPairs).mockReturnValue({
      data: mockPairings,
      isLoading: false,
    } as any);

    const { result } = renderHook(() => usePairing(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Expected order:
    // 1. p3 (active pair & prog, latest date: Oct 2023, name 'Mentee B' comes before 'Mentor C')
    // 2. p4 (active pair & prog, latest date: Oct 2023, name 'Mentor C')
    // 3. p2 (active pair & prog, date: May 2023)
    // 4. p1 (archived pair)
    const sortedIds = result.current.pairings.map(p => p.id);
    expect(sortedIds).toEqual(['p3', 'p4', 'p2', 'p1']);
    
    // Auto-selects the first one
    expect(result.current.selectedPairingId).toBe('p3');
  });

  it('restores selected pairing from localStorage', async () => {
    localStorage.setItem('selected_pairing_u1', 'p2');

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1' },
      loading: false,
      isAutoSelecting: false,
    } as any);

    vi.mocked(useUserPairs).mockReturnValue({
      data: [
        { id: 'p1', status: 'active', program: { status: 'active' } },
        { id: 'p2', status: 'active', program: { status: 'active' } },
      ],
      isLoading: false,
    } as any);

    const { result } = renderHook(() => usePairing(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedPairingId).toBe('p2');
      expect(result.current.selectedPairing?.id).toBe('p2');
    });
  });

  it('allows setting selected pairing and saves to localStorage', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1' },
      loading: false,
      isAutoSelecting: false,
    } as any);

    vi.mocked(useUserPairs).mockReturnValue({
      data: [
        { id: 'p1', status: 'active', program: { status: 'active' } },
        { id: 'p2', status: 'active', program: { status: 'active' } },
      ],
      isLoading: false,
    } as any);

    const { result } = renderHook(() => usePairing(), { wrapper });

    await waitFor(() => {
      expect(result.current.selectedPairingId).toBe('p1');
    });

    act(() => {
      result.current.setSelectedPairingId('p2');
    });

    expect(result.current.selectedPairingId).toBe('p2');
    expect(localStorage.getItem('selected_pairing_u1')).toBe('p2');
  });

  it('clears selected pairing if list becomes empty', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'u1' },
      loading: false,
      isAutoSelecting: false,
    } as any);

    const { result, rerender } = renderHook(() => usePairing(), { wrapper });

    // Start with empty
    vi.mocked(useUserPairs).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    
    rerender();

    await waitFor(() => {
      expect(result.current.selectedPairingId).toBeNull();
    });
  });
});
