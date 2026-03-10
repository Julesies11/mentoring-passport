import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationItem } from '../notification-item';
import { BrowserRouter } from 'react-router-dom';

// Mock KeenIcon since it relies on external SVG or complex logic
vi.mock('@/components/keenicons', () => ({
  KeenIcon: ({ icon, className }: { icon: string; className?: string }) => (
    <span data-testid={`icon-${icon}`} className={className} />
  ),
}));

const mockNotification = {
  id: '1',
  recipient_id: 'user-1',
  type: 'evidence_uploaded',
  title: 'Test Notification',
  description: 'This is a test description',
  action_url: '/test-url',
  related_id: 'rel-1',
  is_read: false,
  created_at: new Date().toISOString(),
};

const renderNotification = (notification = mockNotification) => {
  const onMarkAsRead = vi.fn();
  const onDelete = vi.fn();
  
  return {
    ...render(
      <BrowserRouter>
        <NotificationItem 
          notification={notification} 
          onMarkAsRead={onMarkAsRead} 
          onDelete={onDelete} 
        />
      </BrowserRouter>
    ),
    onMarkAsRead,
    onDelete,
  };
};

describe('NotificationItem', () => {
  it('renders notification basic info', () => {
    renderNotification();
    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('displays the correct icon for evidence_uploaded', () => {
    renderNotification();
    expect(screen.getByTestId('icon-file-up')).toBeInTheDocument();
  });

  it('displays the correct icon for milestone_50', () => {
    renderNotification({
      ...mockNotification,
      type: 'milestone_50',
    });
    expect(screen.getByTestId('icon-award')).toBeInTheDocument();
  });

  it('shows unread indicator when is_read is false', () => {
    renderNotification({ ...mockNotification, is_read: false });
    // The unread dot is a div with a specific class in our implementation
    const dot = screen.getByRole('link').querySelector('.bg-primary.rounded-full');
    expect(dot).toBeInTheDocument();
  });

  it('hides unread indicator when is_read is true', () => {
    renderNotification({ ...mockNotification, is_read: true });
    const dot = screen.queryByRole('link')?.querySelector('.bg-primary.rounded-full');
    expect(dot).not.toBeInTheDocument();
  });

  it('calls onMarkAsRead when clicked', () => {
    const { onMarkAsRead } = renderNotification();
    fireEvent.click(screen.getByRole('link'));
    expect(onMarkAsRead).toHaveBeenCalledWith('1');
  });

  it('calls onDelete when delete button is clicked', () => {
    const { onDelete } = renderNotification();
    const deleteBtn = screen.getByLabelText('Delete notification');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('links to the correct action_url', () => {
    renderNotification();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/test-url');
  });
});
