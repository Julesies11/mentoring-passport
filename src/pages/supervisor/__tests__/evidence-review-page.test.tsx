import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { EvidenceReviewPage } from '../evidence-review-page';
import * as evidenceHooks from '@/hooks/use-evidence';

// Mock evidence hooks
vi.mock('@/hooks/use-evidence', () => ({
  useAllEvidence: vi.fn(),
  usePendingEvidence: vi.fn(),
  useEvidenceStats: vi.fn(() => ({ data: { pending: 2, reviewed: 0 } })),
}));

// Mock organisation provider to avoid DB calls
vi.mock('@/providers/organisation-provider', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useOrganisation: vi.fn(() => ({ 
      activeProgram: { id: 'p1', name: 'Test Program' }, 
      programs: [],
      isLoading: false 
    })),
  };
});

const mockEvidence = [
  {
    id: 'e1',
    pair_id: 'p1',
    status: 'pending',
    submitted_by: 'u1',
    description: 'Evidence 1',
    created_at: new Date().toISOString(),
    task: { name: 'Task 1' },
    pair: { 
      mentor: { id: 'm1', full_name: 'Mentor 1' }, 
      mentee: { id: 'me1', full_name: 'Mentee 1' } 
    }
  },
  {
    id: 'e2',
    pair_id: 'p2',
    status: 'pending',
    submitted_by: 'u2',
    description: 'Evidence 2',
    created_at: new Date().toISOString(),
    task: { name: 'Task 2' },
    pair: { 
      mentor: { id: 'm2', full_name: 'Mentor 2' }, 
      mentee: { id: 'me2', full_name: 'Mentee 2' } 
    }
  }
];

describe('EvidenceReviewPage', () => {
  it('renders all evidence by default', () => {
    vi.mocked(evidenceHooks.useAllEvidence).mockReturnValue({
      data: mockEvidence,
      isLoading: false,
    } as any);
    vi.mocked(evidenceHooks.usePendingEvidence).mockReturnValue({
      stats: { total: 2, pending: 2, approved: 0, rejected: 0 },
      reviewEvidence: vi.fn(),
      isReviewing: false,
    } as any);

    render(<EvidenceReviewPage />);
    
    expect(screen.getByText('Mentor 1')).toBeInTheDocument();
    expect(screen.getByText('Mentor 2')).toBeInTheDocument();
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('filters evidence by pairId from search params', () => {
    // We need to simulate the URL having ?pairId=p1
    delete (window as any).location;
    (window as any).location = new URL('http://localhost/supervisor/evidence-review?pairId=p1');

    vi.mocked(evidenceHooks.useAllEvidence).mockReturnValue({
      data: mockEvidence,
      isLoading: false,
    } as any);
    vi.mocked(evidenceHooks.usePendingEvidence).mockReturnValue({
      stats: { total: 2, pending: 2, approved: 0, rejected: 0 },
      reviewEvidence: vi.fn(),
      isReviewing: false,
    } as any);

    render(<EvidenceReviewPage />);
    
    expect(screen.getByText('Mentor 1')).toBeInTheDocument();
    expect(screen.queryByText('Mentor 2')).not.toBeInTheDocument();
    expect(screen.getByText('Clear Filter')).toBeInTheDocument();
  });
});
