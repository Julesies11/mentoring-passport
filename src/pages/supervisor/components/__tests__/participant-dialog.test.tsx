import { ROLES, PROFILE_STATUS } from '@/config/constants';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { ParticipantDialog } from '@/components/participants/participant-dialog';

// Mock the avatar upload utility
vi.mock('@/lib/api/profiles', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    handleAvatarUpload: vi.fn(),
  };
});

describe('ParticipantDialog', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly for creating a new participant', () => {
    render(
      <ParticipantDialog 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit} 
      />
    );
    
    expect(screen.getByText('Add New User')).toBeDefined();
    expect(screen.getByLabelText(/Email \*/i)).toBeDefined();
    expect(screen.getByLabelText(/Password \*/i)).toBeDefined();
    expect(screen.getByText('Profile Picture')).toBeDefined();
  });

  it('renders correctly for editing an existing participant', () => {
    const participant = {
      id: 'p1',
      email: 'p1@example.com',
      role: ROLES.PROGRAM_MEMBER,
      full_name: 'John Participant',
      job_title: 'Doctor',
      status: PROFILE_STATUS.ACTIVE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active_mentor_count: 0,
      active_mentee_count: 0,
      inactive_mentor_count: 0,
      inactive_mentee_count: 0,
      avatar_url: 'p1.jpg'
    };

    render(
      <ParticipantDialog 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit}
        participant={participant}
      />
    );
    
    expect(screen.getByText('Edit User')).toBeDefined();
    expect(screen.getByLabelText(/Full Name \*/i)).toHaveValue('John Participant');
    expect(screen.queryByLabelText(/Password \*/i)).toBeNull(); // Password hidden in edit mode
  });

  it('submits form with correct data', async () => {
    render(
      <ParticipantDialog 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit} 
      />
    );
    
    fireEvent.change(screen.getByLabelText(/Email \*/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password \*/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/Full Name \*/i), { target: { value: 'New Participant' } });
    
    const submitButton = screen.getByRole('button', { name: /Create Participant/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        email: 'new@example.com',
        full_name: 'New Participant',
        role: ROLES.PROGRAM_MEMBER
      }));
    });
  });
});
