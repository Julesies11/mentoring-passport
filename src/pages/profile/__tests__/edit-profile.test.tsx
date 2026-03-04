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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with user data', () => {
    render(<EditProfilePage />);
    
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue('Test Supervisor');
    expect(screen.getByText('Profile Picture')).toBeDefined();
  });

  it('submits correctly with updated data', async () => {
    (handleAvatarUpload as any).mockResolvedValue('new-avatar.png');
    
    render(<EditProfilePage />);
    
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'Updated Name' } });
    
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);
    
    // Check that it calls our mocked handleAvatarUpload
    await waitFor(() => {
      expect(handleAvatarUpload).toHaveBeenCalled();
    });
  });

  it('resets form when discard changes is clicked', () => {
    render(<EditProfilePage />);
    
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    
    const discardButton = screen.getByText(/Discard Changes/i);
    fireEvent.click(discardButton);
    
    expect(nameInput).toHaveValue('Test Supervisor');
  });
});
