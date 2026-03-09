import { supabase } from '@/lib/supabase';

export interface ErrorLog {
  id: string;
  user_id: string | null;
  message: string;
  stack: string | null;
  url: string | null;
  component_name: string | null;
  metadata: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
}

/**
 * Fetch error logs with profile information
 */
export async function fetchErrorLogs(): Promise<ErrorLog[]> {
  const { data, error } = await supabase
    .from('mp_error_logs')
    .select(`
      *,
      profiles:user_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching logs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Delete an error log entry
 */
export async function deleteErrorLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('mp_error_logs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Clear all error logs
 */
export async function clearAllErrorLogs(): Promise<void> {
  const { error } = await supabase
    .from('mp_error_logs')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (error) throw error;
}
