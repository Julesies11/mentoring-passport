import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';

export interface Notification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  description: string | null;
  action_url: string | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Fetch notifications for the current user
 */
export async function fetchNotifications(limit = 50): Promise<Notification[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return [];

    const { data, error } = await supabase
      .from('mp_notifications')
      .select('*')
      .eq('recipient_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      await logError({
        message: `Error fetching notifications: ${error.message}`,
        componentName: 'notifications-api',
        severity: 'error',
        metadata: { error }
      });
      throw error;
    }

    return data || [];
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    throw err;
  }
}

/**
 * Fetch unread notification count
 */
export async function fetchUnreadCount(): Promise<number> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return 0;

    const { count, error } = await supabase
      .from('mp_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', session.user.id)
      .eq('is_read', false);

    if (error) {
      await logError({
        message: `Error fetching unread count: ${error.message}`,
        componentName: 'notifications-api',
        severity: 'error',
        metadata: { error }
      });
      throw error;
    }

    return count || 0;
  } catch (err: any) {
    console.error('Error fetching unread count:', err);
    throw err;
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      await logError({
        message: `Error marking notification as read: ${error.message}`,
        componentName: 'notifications-api',
        severity: 'error',
        metadata: { notificationId, error }
      });
      throw error;
    }
  } catch (err: any) {
    console.error('Error marking notification as read:', err);
    throw err;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const { error } = await supabase
      .from('mp_notifications')
      .update({ is_read: true })
      .eq('recipient_id', session.user.id)
      .eq('is_read', false);

    if (error) {
      await logError({
        message: `Error marking all notifications as read: ${error.message}`,
        componentName: 'notifications-api',
        severity: 'error',
        metadata: { error }
      });
      throw error;
    }
  } catch (err: any) {
    console.error('Error marking all notifications as read:', err);
    throw err;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      await logError({
        message: `Error deleting notification: ${error.message}`,
        componentName: 'notifications-api',
        severity: 'error',
        metadata: { notificationId, error }
      });
      throw error;
    }
  } catch (err: any) {
    console.error('Error deleting notification:', err);
    throw err;
  }
}

/**
 * Clear all notifications for the current user
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    const { error } = await supabase
      .from('mp_notifications')
      .delete()
      .eq('recipient_id', session.user.id);

    if (error) {
      await logError({
        message: `Error clearing notifications: ${error.message}`,
        componentName: 'notifications-api',
        severity: 'error',
        metadata: { error }
      });
      throw error;
    }
  } catch (err: any) {
    console.error('Error clearing notifications:', err);
    throw err;
  }
}

/**
 * Create a notification
 */
export async function createNotification(
  recipientId: string,
  type: string,
  title: string,
  description: string | null,
  actionUrl: string | null = null,
  relatedId: string | null = null
): Promise<void> {
  try {
    const { error } = await supabase
      .from('mp_notifications')
      .insert({
        recipient_id: recipientId,
        type,
        title,
        description,
        action_url: actionUrl,
        related_id: relatedId,
        is_read: false,
      });

    if (error) {
      await logError({
        message: `Error creating notification: ${error.message}`,
        componentName: 'notifications-api',
        severity: 'error',
        metadata: { recipientId, type, title, error }
      });
      throw error;
    }
  } catch (err: any) {
    console.error('Error creating notification:', err);
    throw err;
  }
}

/**
 * Subscribe to real-time notification updates
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void,
  onDelete: (notificationId: string) => void,
) {
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mp_notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new as Notification);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'mp_notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        onDelete(payload.old.id);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'mp_notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new as Notification);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
