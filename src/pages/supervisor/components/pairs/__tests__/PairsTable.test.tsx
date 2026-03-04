import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PairsTable } from '../PairsTable';
import { render } from '@/test/utils';

// Mock hooks
vi.mock('@/hooks/use-tasks', () => ({
  useAllPairTaskStatuses: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

describe('PairsTable', () => {
  const mockPairs = [
    {
      id: 'p1',
      status: 'active',
      mentor: { id: 'm1', full_name: 'Mentor One', email: 'm1@test.com' },
      mentee: { id: 'e1', full_name: 'Mentee One', email: 'e1@test.com' },
      created_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    render(<PairsTable pairs={[]} isLoading={true} onShowMatchmaker={vi.fn()} />);
    expect(screen.getByText(/loading pairs/i)).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<PairsTable pairs={[]} isLoading={false} onShowMatchmaker={vi.fn()} />);
    expect(screen.getByText(/no pairings found/i)).toBeInTheDocument();
  });

  it('renders pairs data', () => {
    render(<PairsTable pairs={mockPairs} isLoading={false} onShowMatchmaker={vi.fn()} />);
    expect(screen.getByText('Mentor One')).toBeInTheDocument();
    expect(screen.getByText('Mentee One')).toBeInTheDocument();
  });

  it('filters by search query', () => {
    render(<PairsTable pairs={mockPairs} isLoading={false} onShowMatchmaker={vi.fn()} />);
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Mentor One' } });
    
    expect(screen.getByText('Mentor One')).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });
    expect(screen.queryByText('Mentor One')).not.toBeInTheDocument();
    expect(screen.getByText(/no pairings found/i)).toBeInTheDocument();
  });
});
