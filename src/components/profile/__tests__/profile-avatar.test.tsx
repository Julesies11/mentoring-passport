import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { ProfileAvatar } from '../profile-avatar';

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

    expect(screen.getByText('JD')).toBeDefined();
  });

  it('renders image when avatar path is provided', () => {
    render(
      <ProfileAvatar 
        userId={userId} 
        userName={userName} 
        currentAvatar="photo.jpg" 
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toContain('photo.jpg');
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
