import { PAIR_STATUS } from '@/config/constants';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PairsManagementTable } from '../PairsManagementTable';
import { render } from '@/test/utils';

// Mock hooks
vi.mock('@/hooks/use-tasks', () => ({
  useAllPairTaskStatuses: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

describe('PairsManagementTable', () => {
  const mockPairs = [
    {
      id: 'p1',
      status: PAIR_STATUS.ACTIVE,
      mentor: { id: 'm1', full_name: 'Mentor One', email: 'm1@test.com', job_title_id: 'jt1' },
      mentee: { id: 'e1', full_name: 'Mentee One', email: 'e1@test.com', job_title_id: 'jt2' },
      created_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    render(<PairsManagementTable pairs={[]} isLoading={true} onShowMatchmaker={vi.fn()} />);
    expect(screen.getByText(/loading pairs/i)).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<PairsManagementTable pairs={[]} isLoading={false} onShowMatchmaker={vi.fn()} />);
    expect(screen.getByText(/no pairings found/i)).toBeInTheDocument();
  });

  it('renders pairs data', () => {
    render(<PairsManagementTable pairs={mockPairs} isLoading={false} onShowMatchmaker={vi.fn()} />);
    expect(screen.getByText('Mentor One')).toBeInTheDocument();
    expect(screen.getByText('Mentee One')).toBeInTheDocument();
  });

  it('filters by search query', async () => {
    render(<PairsManagementTable pairs={mockPairs} isLoading={false} onShowMatchmaker={vi.fn()} />);
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Mentor One' } });
    
    await waitFor(() => {
      expect(screen.getByText('Mentor One')).toBeInTheDocument();
    });
    
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });
    await waitFor(() => {
      expect(screen.queryByText('Mentor One')).not.toBeInTheDocument();
      expect(screen.getByText(/no pairings found/i)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    // Generate 60 pairs to ensure we have multiple pages with itemsPerPage at 50
    const manyPairs = Array.from({ length: 60 }, (_, i) => ({
      id: `p${i}`,
      status: PAIR_STATUS.ACTIVE,
      mentor: { id: `m${i}`, full_name: `Mentor ${i + 1}`, email: `m${i}@test.com`, job_title_id: 'jt1' },
      mentee: { id: `e${i}`, full_name: `Mentee ${i + 1}`, email: `e${i}@test.com`, job_title_id: 'jt2' },
      // Ensure newest first
      created_at: new Date(2025, 1, 60 - i).toISOString(),
    }));

    it('shows only first 50 pairs on page 1', () => {
      render(<PairsManagementTable pairs={manyPairs} isLoading={false} onShowMatchmaker={vi.fn()} />);
      expect(screen.getByText('Mentor 1')).toBeInTheDocument();
      expect(screen.getByText('Mentor 50')).toBeInTheDocument();
      expect(screen.queryByText('Mentor 51')).not.toBeInTheDocument();
    });

    it('navigates to page 2 when next arrow is clicked', async () => {
      render(<PairsManagementTable pairs={manyPairs} isLoading={false} onShowMatchmaker={vi.fn()} />);
      
      const nextButton = screen.getByTestId('keen-icon-black-right').closest('button');
      fireEvent.click(nextButton!);
      
      await waitFor(() => {
        expect(screen.queryByText('Mentor 1')).not.toBeInTheDocument();
        expect(screen.getByText('Mentor 51')).toBeInTheDocument();
        expect(screen.getByText('Mentor 60')).toBeInTheDocument();
      });
    });

    it('resets to page 1 when search query changes', async () => {
      render(<PairsManagementTable pairs={manyPairs} isLoading={false} onShowMatchmaker={vi.fn()} />);
      
      // 1. Go to page 2
      const nextButton = screen.getByTestId('keen-icon-black-right').closest('button');
      fireEvent.click(nextButton!);
      await waitFor(() => {
        expect(screen.getByText('Mentor 51')).toBeInTheDocument();
      });

      // 2. Change search term
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Mentor' } });

      // 3. Should be back on page 1
      await waitFor(() => {
        expect(screen.getByText('Mentor 1')).toBeInTheDocument();
        expect(screen.queryByText('Mentor 51')).not.toBeInTheDocument();
      });
    });
  });
});
