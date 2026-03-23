import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  type Notification,
} from '@/lib/api/notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from '@/providers/notification-provider';

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { unreadCount } = useNotificationContext();
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
    enabled: !!user?.id,
  });

  const loadMore = () => setLimit(prev => prev + 20);

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

  // Clear all notifications mutation
  const clearAllNotificationsMutation = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

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
    clearAllNotifications: clearAllNotificationsMutation.mutate,
  };
}
