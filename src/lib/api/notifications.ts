import { supabase } from '@/lib/supabase';

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
  const { data, error } = await supabase
    .from('mp_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch unread notification count
 */
export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('mp_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }

  return count || 0;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  const { error } = await supabase
    .from('mp_notifications')
    .update({ is_read: true })
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('mp_notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    throw error;
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
): Promise<Notification> {
  const { data, error } = await supabase
    .from('mp_notifications')
    .insert({
      recipient_id: recipientId,
      type,
      title,
      description,
      action_url: actionUrl,
      related_id: relatedId,
      is_read: false,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  return data;
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
