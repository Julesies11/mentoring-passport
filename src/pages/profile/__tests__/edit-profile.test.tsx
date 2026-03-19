import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { EditProfilePage } from '../edit-profile';
import { handleAvatarUpload } from '@/lib/api/profiles';

// Mock the avatar upload utility
vi.mock('@/lib/api/profiles', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    handleAvatarUpload: vi.fn(),
  };
});

describe('EditProfilePage', () => {
  const mockUser = {
    id: 'u1',
    email: 'test@example.com',
    full_name: 'Test Supervisor',
    job_title_id: 'jt1',
    role: 'supervisor'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with user data', () => {
    render(<EditProfilePage />, { authValue: { user: mockUser } });
    
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue('Test Supervisor');
    expect(screen.getByText('Profile Picture')).toBeDefined();
  });

  it('submits correctly with updated data', async () => {
    (handleAvatarUpload as any).mockResolvedValue('new-avatar.png');
    
    render(<EditProfilePage />, { authValue: { user: mockUser } });
    
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);
    
    // Check that it calls our mocked handleAvatarUpload
    await waitFor(() => {
      expect(handleAvatarUpload).toHaveBeenCalled();
    });
  });

  it('resets form when cancel is clicked', () => {
    render(<EditProfilePage />, { authValue: { user: mockUser } });
    
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    
    const cancelButton = screen.getByText(/Cancel/i);
    fireEvent.click(cancelButton);
    
    expect(nameInput).toHaveValue('Test Supervisor');
  });
});
