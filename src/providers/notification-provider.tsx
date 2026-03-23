import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import {
  fetchUnreadCount,
  subscribeToNotifications,
  type Notification,
} from '@/lib/api/notifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface NotificationContextType {
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch unread count globally
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => fetchUnreadCount(),
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
  });

  // Centralised Real-time subscription (Single channel for the whole app)
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToNotifications(
      user.id,
      (_notification) => {
        // Invalidate to ensure consistency across all notification queries
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      },
      (_notificationId) => {
        // Invalidate to ensure consistency across all notification queries
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      },
    );

    return unsubscribe;
  }, [user?.id, queryClient]);

  const value = useMemo(() => ({
    unreadCount,
  }), [unreadCount]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}
