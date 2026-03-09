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
    let userId = null;
    if (supabase?.auth) {
      const { data: sessionData } = await supabase.auth.getSession();
      userId = sessionData?.session?.user?.id || null;
    }

    let finalMessage = message;
    if (message.includes('exceeded the maximum allowed size')) {
      finalMessage = `Supabase Storage Limit Hit: ${message}`;
    }

    const errorPayload = {
      user_id: userId,
      message: finalMessage,
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

    if (supabase?.from) {
      const { error } = await supabase.from('mp_error_logs').insert(errorPayload);

      if (error) {
        // If the insert fails (e.g., RLS issue, network down), fallback to console
        console.error('Failed to save error log to Supabase:', error);
      }
    } else {
      console.warn('Supabase not fully initialized, could not save error log.');
    }
  } catch (err) {
    // Ultimate fallback if the whole logging process crashes
    console.error('Critical failure in logError utility:', err);
  }
};
