import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParticipantsContent } from '../participants-content';
import { render } from '@/test/utils';

// Mock hooks
vi.mock('@/hooks/use-participants', () => ({
  useParticipants: vi.fn(),
}));

vi.mock('@/hooks/use-pairs', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    usePairs: vi.fn(),
  };
});

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

import { useParticipants } from '@/hooks/use-participants';
import { usePairs } from '@/hooks/use-pairs';

describe('ParticipantsContent', () => {
  const mockParticipants = [
    { id: 'u1', full_name: 'John Doe', email: 'john@test.com', role: 'program-member', status: 'active', job_title: 'Developer' },
    { id: 'u2', full_name: 'Jane Smith', email: 'jane@test.com', role: 'supervisor', status: 'active', job_title: 'Manager' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePairs).mockReturnValue({ pairs: [], isLoading: false } as any);
  });

  it('renders loading state', () => {
    vi.mocked(useParticipants).mockReturnValue({ participants: [], isLoading: true } as any);
    render(<ParticipantsContent />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders participants list', () => {
    vi.mocked(useParticipants).mockReturnValue({ 
      participants: mockParticipants, 
      isLoading: false,
      stats: { total: 2, 'program-members': 1, supervisors: 1, archived: 0 }
    } as any);

    render(<ParticipantsContent />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('filters participants by search term', () => {
    vi.mocked(useParticipants).mockReturnValue({ 
      participants: mockParticipants, 
      isLoading: false,
      stats: { total: 2 }
    } as any);

    render(<ParticipantsContent />);
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });
});
