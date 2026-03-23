import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNotifications } from '../use-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as notificationsApi from '@/lib/api/notifications';
import { AuthContext } from '@/auth/context/auth-context';
import { NotificationProvider } from '@/providers/notification-provider';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/api/notifications', () => ({
  fetchNotifications: vi.fn(),
  fetchUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
  clearAllNotifications: vi.fn(),
  subscribeToNotifications: vi.fn(() => vi.fn()),
}));

const mockUser = { id: 'u1', email: 'test@test.com' };

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={{ user: mockUser, loading: false } as any}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
};

describe('useNotifications hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches notifications and unread count', async () => {
    const mockList = [{ id: 'n1', title: 'Test' }];
    vi.mocked(notificationsApi.fetchNotifications).mockResolvedValue(mockList as any);
    vi.mocked(notificationsApi.fetchUnreadCount).mockResolvedValue(1);

    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toEqual(mockList);
    expect(result.current.unreadCount).toBe(1);
  });

  it('calls markAsRead mutation', async () => {
    vi.mocked(notificationsApi.fetchNotifications).mockResolvedValue([]);
    vi.mocked(notificationsApi.fetchUnreadCount).mockResolvedValue(0);
    
    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    result.current.markAsRead('n1');

    await waitFor(() => {
      expect(notificationsApi.markAsRead).toHaveBeenCalledWith('n1', expect.anything());
    });
  });
});
