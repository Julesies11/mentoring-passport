import { render, screen, fireEvent } from '@/test/utils';
import { MatchmakerDialog } from '../MatchmakerDialog';
import { describe, it, expect, vi } from 'vitest';
import { ROLES } from '@/config/constants';

const mockParticipants = [
  { id: 'p1', full_name: 'Alice Mentor', email: 'alice@example.com', role: ROLES.PROGRAM_MEMBER, job_title_id: 'jt1' },
  { id: 'p2', full_name: 'Bob Mentee', email: 'bob@example.com', role: ROLES.PROGRAM_MEMBER, job_title_id: 'jt2' },
  { id: 'p3', full_name: 'Charlie User', email: 'charlie@example.com', role: ROLES.PROGRAM_MEMBER, job_title_id: 'jt3' },
];

const mockPairs = [];

describe('MatchmakerDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    participants: mockParticipants,
    pairs: mockPairs,
    onCreatePair: vi.fn(),
    isCreating: false,
  };

  it('renders participant lists', () => {
    render(<MatchmakerDialog {...defaultProps} />);
    
    // Check if participants appear in both columns (Mentor and Mentee)
    // Using getAllByText because they appear in both lists
    expect(screen.getAllByText('Alice Mentor').length).toBe(2);
    expect(screen.getAllByText('Bob Mentee').length).toBe(2);
  });

  it('allows selecting a mentor and a mentee', () => {
    render(<MatchmakerDialog {...defaultProps} />);
    
    // Select Alice as Mentor (first column)
    const mentorAlice = screen.getAllByText('Alice Mentor')[0];
    fireEvent.click(mentorAlice);
    
    // Select Bob as Mentee (second column)
    const menteeBob = screen.getAllByText('Bob Mentee')[1]; // Mentee column is index 1
    fireEvent.click(menteeBob);
    
    // Check if placeholder is GONE
    expect(screen.queryByText('Please select both a mentor and a mentee to proceed...')).not.toBeInTheDocument();
    
    // Check if both names are visible in the summary area (they appear exactly 2 times now: their own list and summary)
    expect(screen.getAllByText('Alice Mentor').length).toBe(2);
    expect(screen.getAllByText('Bob Mentee').length).toBe(2);
  });

  it('calls onCreatePair when Create Pairing is clicked', () => {
    const onCreatePair = vi.fn();
    render(<MatchmakerDialog {...defaultProps} onCreatePair={onCreatePair} />);
    
    // Select mentor and mentee
    fireEvent.click(screen.getAllByText('Alice Mentor')[0]);
    fireEvent.click(screen.getAllByText('Bob Mentee')[1]); // Index 1 is mentee column
    
    const createButton = screen.getByText('Create Pairing');
    fireEvent.click(createButton);
    
    expect(onCreatePair).toHaveBeenCalledWith('p1', 'p2');
  });

  it('disables create button while isCreating is true', () => {
    render(<MatchmakerDialog {...defaultProps} isCreating={true} />);
    
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Creating.../ })).toBeDisabled();
  });
});
