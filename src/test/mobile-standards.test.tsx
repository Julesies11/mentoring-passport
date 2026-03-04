import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupervisorDashboardPage } from '@/pages/supervisor/dashboard-page';
import { render } from '@/test/utils';

// Mock hooks
vi.mock('@/hooks/use-participants', () => ({
  useAllParticipants: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/use-pairs', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    usePairs: vi.fn(() => ({ pairs: [], isLoading: false })),
  };
});

vi.mock('@/hooks/use-evidence', () => ({
  usePendingEvidence: vi.fn(() => ({ evidence: [], isLoading: false })),
}));

vi.mock('@/hooks/use-tasks', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useAllPairTaskStatuses: vi.fn(() => ({ data: [], isLoading: false })),
  };
});

// We need to mock useIsMobile to return true for mobile tests
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(),
}));

import { useIsMobile } from '@/hooks/use-mobile';

describe('Mobile UI Standards', () => {
  const mockUser = { id: 's1', email: 'supervisor@test.com', role: 'supervisor' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides dashboard summary cards on mobile', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    
    render(<SupervisorDashboardPage />, { authValue: { user: mockUser as any } });
    
    const summaryContainer = screen.getByTestId('executive-summary');
    expect(summaryContainer).toBeInTheDocument();
    expect(summaryContainer).toHaveClass('hidden');
    expect(summaryContainer).toHaveClass('sm:grid');
  });

  it('uses table-fixed on mobile for Relationship Progress Tracker', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    
    const { container } = render(<SupervisorDashboardPage />, { authValue: { user: mockUser as any } });
    
    const table = container.querySelector('table');
    expect(table).toHaveClass('table-fixed');
    expect(table).toHaveClass('md:table-auto');
  });

  it('hides toolbar heading on mobile', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    
    render(<SupervisorDashboardPage />, { authValue: { user: mockUser as any } });
    
    const toolbarWrapper = screen.getByTestId('dashboard-toolbar');
    expect(toolbarWrapper).toBeInTheDocument();
    expect(toolbarWrapper).toHaveClass('hidden');
    expect(toolbarWrapper).toHaveClass('sm:block');
  });
});
