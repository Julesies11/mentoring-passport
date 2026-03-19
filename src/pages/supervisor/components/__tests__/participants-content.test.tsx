import { ROLES, PROFILE_STATUS } from '@/config/constants';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParticipantsContent } from '../participants-content';
import { render } from '@/test/utils';

// Mock hooks
vi.mock('@/hooks/use-participants', () => ({
  useParticipants: vi.fn(),
  useAllParticipants: vi.fn(() => ({ data: [], isLoading: false })),
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

// Mock API calls made by providers
vi.mock('@/lib/api/organisations', () => ({
  fetchOrganisation: vi.fn(() => Promise.resolve({ id: 'org1', name: 'Test Org' })),
}));

vi.mock('@/lib/api/programs', () => ({
  fetchPrograms: vi.fn(() => Promise.resolve([])),
  fetchAssignedPrograms: vi.fn(() => Promise.resolve([])),
}));

import { useParticipants } from '@/hooks/use-participants';
import { usePairs } from '@/hooks/use-pairs';

describe('ParticipantsContent', () => {
  const mockParticipants = [
    { id: 'u1', full_name: 'John Doe', email: 'john@test.com', role: ROLES.PROGRAM_MEMBER, status: PROFILE_STATUS.ACTIVE, job_title_id: 'jt1', job_title_name: 'Developer' },
    { id: 'u2', full_name: 'Jane Smith', email: 'jane@test.com', role: ROLES.SUPERVISOR, status: PROFILE_STATUS.ACTIVE, job_title_id: 'jt2', job_title_name: 'Manager' },
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

  it('shows management tools for Org Admin', () => {
    vi.mocked(useParticipants).mockReturnValue({ 
      participants: mockParticipants, 
      isLoading: false,
      stats: { total: 2 }
    } as any);

    render(<ParticipantsContent />, {
      authValue: { role: ROLES.ORG_ADMIN, isOrgAdmin: true }
    });
    
    expect(screen.getByText('Manage Members')).toBeInTheDocument();
    expect(screen.getByText('Add Member')).toBeInTheDocument();
    // Edit buttons should be present
    expect(screen.getAllByTitle('Edit Member').length).toBeGreaterThan(0);
  });

  it('hides management tools for Supervisor', () => {
    vi.mocked(useParticipants).mockReturnValue({ 
      participants: mockParticipants, 
      isLoading: false,
      stats: { total: 2 }
    } as any);

    render(<ParticipantsContent />, {
      authValue: { role: ROLES.SUPERVISOR, isOrgAdmin: false, isSupervisor: true }
    });
    
    expect(screen.getByText('Member Directory')).toBeInTheDocument();
    expect(screen.queryByText('Add Member')).not.toBeInTheDocument();
    // Edit buttons should be hidden
    expect(screen.queryByTitle('Edit Member')).not.toBeInTheDocument();
  });

  it('filters participants by search term', async () => {
    vi.mocked(useParticipants).mockReturnValue({ 
      participants: mockParticipants, 
      isLoading: false,
      stats: { total: 2 }
    } as any);

    render(<ParticipantsContent />);
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    // Generate 55 participants to force 2 pages (default 50 per page)
    const manyParticipants = Array.from({ length: 55 }, (_, i) => ({
      id: `u${i}`,
      full_name: `User ${i + 1}`,
      email: `user${i + 1}@test.com`,
      role: ROLES.PROGRAM_MEMBER,
      status: PROFILE_STATUS.ACTIVE,
      job_title_id: 'jt1',
      job_title_name: 'Staff'
    }));

    beforeEach(() => {
      vi.mocked(useParticipants).mockReturnValue({ 
        participants: manyParticipants, 
        isLoading: false,
        stats: { total: 55 }
      } as any);
    });

    it('shows only first 50 items on page 1', () => {
      render(<ParticipantsContent />);
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 50')).toBeInTheDocument();
      expect(screen.queryByText('User 51')).not.toBeInTheDocument();
    });

    it('navigates to page 2 when next arrow is clicked', async () => {
      render(<ParticipantsContent />);
      
      // Look for the next arrow icon button
      const nextButton = screen.getByTestId('keen-icon-black-right').closest('button');
      if (!nextButton) throw new Error('Next button not found');
      
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.queryByText('User 1')).not.toBeInTheDocument();
        expect(screen.getByText('User 51')).toBeInTheDocument();
        expect(screen.getByText('User 55')).toBeInTheDocument();
      });
    });

    it('resets to page 1 when search term changes', async () => {
      render(<ParticipantsContent />);
      
      // 1. Go to page 2
      const nextButton = screen.getByTestId('keen-icon-black-right').closest('button');
      fireEvent.click(nextButton!);
      
      await waitFor(() => {
        expect(screen.getByText('User 51')).toBeInTheDocument();
      });

      // 2. Change search term
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'User' } });

      // 3. Should be back on page 1 (verified by presence of User 1)
      await waitFor(() => {
        expect(screen.getByText('User 1')).toBeInTheDocument();
        expect(screen.queryByText('User 51')).not.toBeInTheDocument();
      });
    });
  });
});
