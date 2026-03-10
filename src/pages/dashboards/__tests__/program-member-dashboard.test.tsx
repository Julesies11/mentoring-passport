import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgramMemberDashboardPage } from '../program-member-dashboard';
import { render } from '@/test/utils';

// Partial mock for pairing-provider to keep PairingProvider but mock usePairing
vi.mock('@/providers/pairing-provider', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    usePairing: vi.fn(),
  };
});

vi.mock('@/hooks/use-tasks', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useTasks: vi.fn(),
  };
});

vi.mock('@/hooks/use-meetings', () => ({
  useAllMeetings: vi.fn(),
}));

import { usePairing } from '@/providers/pairing-provider';
import { useTasks } from '@/hooks/use-tasks';
import { useAllMeetings } from '@/hooks/use-meetings';

describe('ProgramMemberDashboardPage', () => {
  const mockUser = { id: 'u1', email: 'test@example.com', full_name: 'Test User' };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(useTasks).mockReturnValue({ fetchPairTasks: vi.fn().mockResolvedValue([]) } as any);
    vi.mocked(useAllMeetings).mockReturnValue({ meetings: [] } as any);
  });

  it('renders loading state', () => {
    vi.mocked(usePairing).mockReturnValue({ pairings: [], isLoading: true, setSelectedPairingId: vi.fn() } as any);
    
    render(<ProgramMemberDashboardPage />, { authValue: { user: mockUser } });
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders empty state when no pairings', () => {
    vi.mocked(usePairing).mockReturnValue({ pairings: [], isLoading: false, setSelectedPairingId: vi.fn() } as any);
    
    render(<ProgramMemberDashboardPage />, { authValue: { user: mockUser } });
    expect(screen.getByText(/no active pairings found/i)).toBeInTheDocument();
  });

  it('renders relationship section when active pairings exist', async () => {
    const mockPairing = {
      id: 'p1',
      status: 'active',
      program: { status: 'active', name: 'Test Program' },
      mentor_id: 'u1', // User is mentor
      mentee_id: 'u2',
      mentee: { id: 'u2', full_name: 'Mentee Name', email: 'mentee@test.com' },
      mentor: mockUser,
      updated_at: new Date().toISOString(),
    };

    vi.mocked(usePairing).mockReturnValue({ 
      pairings: [mockPairing], 
      isLoading: false, 
      setSelectedPairingId: vi.fn() 
    } as any);

    render(<ProgramMemberDashboardPage />, { authValue: { user: mockUser } });

    expect(await screen.findByText(/mentee name/i)).toBeInTheDocument();
    expect(screen.getByText('Your Mentee')).toBeInTheDocument();
    expect(screen.getByText(/program completion/i)).toBeInTheDocument();
  });
});
