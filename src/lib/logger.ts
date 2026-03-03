import { supabase } from '@/lib/supabase';

export interface LogErrorParams {
  message: string;
  stack?: string;
  componentName?: string;
  metadata?: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

/**
 * Logs an error to the mp_error_logs table in Supabase.
 * If Supabase is unreachable, it falls back to console.error.
 */
export const logError = async ({
  message,
  stack,
  componentName,
  metadata = {},
  severity = 'error',
}: LogErrorParams) => {
  try {
    // Attempt to get the current user session
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;

    const errorPayload = {
      user_id: userId,
      message,
      stack: stack || null,
      url: window.location.href,
      component_name: componentName || null,
      metadata,
      severity,
    };

    // Log to console in development or as a backup
    if (import.meta.env.DEV) {
      console.error('[GlobalLogger]', errorPayload);
    }

    const { error } = await supabase.from('mp_error_logs').insert(errorPayload);

    if (error) {
      // If the insert fails (e.g., RLS issue, network down), fallback to console
      console.error('Failed to save error log to Supabase:', error);
    }
  } catch (err) {
    // Ultimate fallback if the whole logging process crashes
    console.error('Critical failure in logError utility:', err);
  }
};
