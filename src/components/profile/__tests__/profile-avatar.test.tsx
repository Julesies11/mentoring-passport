import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { ProfileAvatar } from '../profile-avatar';

// Mock the avatar URL helper
vi.mock('@/lib/utils/avatar', () => ({
  getAvatarPublicUrl: (url: string) => url,
  getInitials: (name: string) => name?.charAt(0) || 'U'
}));

describe('ProfileAvatar Component', () => {
  const userId = 'user-123';
  const userName = 'John Doe';

  it('renders initials fallback when no avatar is provided', () => {
    render(
      <ProfileAvatar 
        userId={userId} 
        userName={userName} 
        currentAvatar={null} 
      />
    );

    // Should show initials (fallback)
    expect(screen.getByText('J')).toBeDefined();
  });

  it('renders image when avatar path is provided', () => {
    render(
      <ProfileAvatar 
        userId={userId} 
        userName={userName} 
        currentAvatar="photo.jpg" 
      />
    );

    // Look for the image component wrapper by its data-src
    const wrapper = document.querySelector('[data-src]');
    expect(wrapper).toBeDefined();
    expect(wrapper?.getAttribute('data-src')).toBe('photo.jpg');
  });

  it('shows edit button when showEditButton is true', () => {
    render(
      <ProfileAvatar 
        userId={userId} 
        userName={userName} 
        showEditButton={true} 
      />
    );

    // Camera icon or button
    const editButton = screen.getByRole('button');
    expect(editButton).toBeDefined();
  });

  it('does not show edit button when showEditButton is false', () => {
    render(
      <ProfileAvatar 
        userId={userId} 
        userName={userName} 
        showEditButton={false} 
      />
    );

    const editButton = screen.queryByRole('button');
    expect(editButton).toBeNull();
  });
});
