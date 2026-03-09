import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToNotifications,
  type Notification,
} from '@/lib/api/notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(20);

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['notifications', limit],
    queryFn: () => fetchNotifications(limit),
    enabled: !!user,
  });

  const loadMore = () => setLimit(prev => prev + 20);

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => fetchUnreadCount(),
    enabled: !!user,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToNotifications(
      user.id,
      (notification) => {
        // Add new notification to cache
        queryClient.setQueryData<Notification[]>(['notifications'], (old = []) => {
          // Check if notification already exists
          if (old.some((n) => n.id === notification.id)) {
            // Update existing notification
            return old.map((n) => (n.id === notification.id ? notification : n));
          }
          // Add new notification at the beginning
          return [notification, ...old];
        });

        // Update unread count
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      },
      (notificationId) => {
        // Remove deleted notification from cache
        queryClient.setQueryData<Notification[]>(['notifications'], (old = []) =>
          old.filter((n) => n.id !== notificationId),
        );

        // Update unread count
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      },
    );

    return unsubscribe;
  }, [user?.id, queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isFetching,
    limit,
    loadMore,
    error,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
  };
}
