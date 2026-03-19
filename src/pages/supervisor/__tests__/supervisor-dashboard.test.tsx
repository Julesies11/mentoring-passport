import { PAIR_STATUS } from '@/config/constants';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupervisorDashboardPage } from '../dashboard-page';
import { render } from '@/test/utils';

// Mock hooks
vi.mock('@/hooks/use-participants', () => ({
  useAllParticipants: vi.fn(),
}));

vi.mock('@/hooks/use-pairs', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    usePairs: vi.fn(),
  };
});

vi.mock('@/hooks/use-evidence', () => ({
  usePendingEvidence: vi.fn(),
}));

vi.mock('@/hooks/use-tasks', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useAllPairTaskStatuses: vi.fn(),
  };
});

// Mock organisation provider
vi.mock('@/providers/organisation-provider', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useOrganisation: vi.fn(() => ({ 
      activeProgram: { id: 'p1', name: 'Test Program' }, 
      programs: [{ id: 'p1', name: 'Test Program' }],
      isLoading: false 
    })),
  };
});

import { useAllParticipants } from '@/hooks/use-participants';
import { usePairs } from '@/hooks/use-pairs';
import { usePendingEvidence } from '@/hooks/use-evidence';
import { useAllPairTaskStatuses } from '@/hooks/use-tasks';

describe('SupervisorDashboardPage', () => {
  const mockUser = { id: 's1', email: 'supervisor@test.com', full_name: 'Supervisor' };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mocks
    vi.mocked(useAllParticipants).mockReturnValue({ data: [], isLoading: false } as any);
    vi.mocked(usePairs).mockReturnValue({ pairs: [], isLoading: false } as any);
    vi.mocked(usePendingEvidence).mockReturnValue({ evidence: [], isLoading: false } as any);
    vi.mocked(useAllPairTaskStatuses).mockReturnValue({ data: [], isLoading: false } as any);
  });

  it('renders executive summary with empty data', () => {
    render(<SupervisorDashboardPage />, { authValue: { user: mockUser } });
    
    // Use getAllByText for ambiguous labels or check unique ones
    expect(screen.getAllByText(/active relationships/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/pending reviews/i)).toBeInTheDocument();
    expect(screen.getByText(/unpaired members/i)).toBeInTheDocument();
  });

  it('renders data in executive summary', () => {
    vi.mocked(usePairs).mockReturnValue({ 
      pairs: [
        { id: 'p1', status: PAIR_STATUS.ACTIVE, mentor_id: 'u1', mentee_id: 'u2', updated_at: new Date().toISOString() }
      ], 
      isLoading: false 
    } as any);

    render(<SupervisorDashboardPage />, { authValue: { user: mockUser } });
    
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 active relationship
  });

  it('renders priority review queue empty state', () => {
    render(<SupervisorDashboardPage />, { authValue: { user: mockUser } });
    expect(screen.getByText(/all caught up!/i)).toBeInTheDocument();
  });
});
