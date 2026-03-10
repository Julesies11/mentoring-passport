import { render, screen, waitFor, fireEvent } from '@/test/utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeetingDialog } from '../meeting-dialog';
import * as pairingProvider from '@/providers/pairing-provider';

// Mock API
vi.mock('@/lib/api/tasks', () => ({
  fetchPairTasks: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/api/pairs', () => ({
  fetchPair: vi.fn(),
  fetchPairs: vi.fn(),
}));

// Mock usePairing hook
vi.mock('@/providers/pairing-provider', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    usePairing: vi.fn(),
  };
});

const mockUser = { id: 'u1', full_name: 'Test User', role: 'program-member' };

describe('MeetingDialog v4 (Double-Active Filtering)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters out pairings where the program is inactive', async () => {
    // Provide 2 active and 1 inactive to force the SELECT to render (length > 1)
    const pairings = [
      { 
        id: 'active-pair-active-prog', 
        status: 'active', 
        mentor_id: 'u1', 
        mentee: { full_name: 'Active Mentee' },
        program: { status: 'active', name: 'Active Program', start_date: '2025-01-01' }
      },
      { 
        id: 'second-active', 
        status: 'active', 
        mentor_id: 'u1', 
        mentee: { full_name: 'Second Mentee' },
        program: { status: 'active', name: 'Active Program', start_date: '2025-01-01' }
      },
      { 
        id: 'active-pair-inactive-prog', 
        status: 'active', 
        mentor_id: 'u1', 
        mentee: { full_name: 'Inactive Prog Mentee' },
        program: { status: 'inactive', name: 'Old Program', start_date: '2024-01-01' }
      }
    ];

    vi.mocked(pairingProvider.usePairing).mockReturnValue({
      pairings,
      selectedPairingId: null,
      setSelectedPairingId: vi.fn(),
      isLoading: false,
      selectedPairing: null
    });

    render(
      <MeetingDialog 
        open={true} 
        onOpenChange={vi.fn()} 
        pairId="" 
        onSubmit={vi.fn() as any} 
      />, 
      { authValue: { user: mockUser as any, isSupervisor: false } }
    );

    // Open select to see options
    const trigger = screen.getByTestId('pair-select-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      // Check that active one exists in the list
      const options = screen.queryAllByText('Active Mentee');
      expect(options.length).toBeGreaterThan(0);
      
      // Inactive one should NOT be in the document at all
      expect(screen.queryByText('Inactive Prog Mentee')).not.toBeInTheDocument();
    });
  });

  it('sorts active pairings by program start date (latest first)', async () => {
    const pairings = [
      { 
        id: 'old-prog', 
        status: 'active', 
        mentor_id: 'u1', 
        mentee: { full_name: 'Old Mentee' },
        program: { status: 'active', name: '2024 Program', start_date: '2024-01-01' }
      },
      { 
        id: 'new-prog', 
        status: 'active', 
        mentor_id: 'u1', 
        mentee: { full_name: 'New Mentee' },
        program: { status: 'active', name: '2025 Program', start_date: '2025-01-01' }
      }
    ];

    vi.mocked(pairingProvider.usePairing).mockReturnValue({
      pairings,
      selectedPairingId: null,
      setSelectedPairingId: vi.fn(),
      isLoading: false,
      selectedPairing: null
    });

    render(
      <MeetingDialog 
        open={true} 
        onOpenChange={vi.fn()} 
        pairId="" 
        onSubmit={vi.fn() as any} 
      />, 
      { authValue: { user: mockUser as any, isSupervisor: false } }
    );

    // Open select
    const trigger = screen.getByTestId('pair-select-trigger');
    fireEvent.click(trigger);

    await waitFor(() => {
      const options = screen.getAllByText(/Program/);
      // options[0] is trigger
      // options[1] should be 2025 (latest)
      // options[2] should be 2024
      expect(options[1]).toHaveTextContent('2025 Program');
      expect(options[2]).toHaveTextContent('2024 Program');
    });
  });
});
