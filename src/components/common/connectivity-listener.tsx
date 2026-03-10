import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

/**
 * Listens for internet connectivity and Supabase Realtime WebSocket events.
 * Displays user-friendly toasts when connection is lost or restored.
 */
export function ConnectivityListener() {
  const isOnlineRef = useRef(navigator.onLine);
  const dbErrorShownRef = useRef(false);
  const hasConnectedOnceRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      toast.dismiss('connectivity-error');
      // Only show restored if we had previously shown an offline error
      if (typeof toast.active === 'function' && !toast.active('connectivity-error')) {
          // This is a bit tricky with sonner as it doesn't have a simple active(id) check
          // but we can rely on our own ref tracking if we wanted to be more precise.
      }
      
      // We'll just show it if we are fairly sure we were offline
      // To be safe and minimal, let's only show success if we're not on initial load
      if (hasConnectedOnceRef.current) {
        toast.success('Internet connection restored', { 
          duration: 3000,
          id: 'connectivity-restored'
        });
      }
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      // Dismiss DB error as it's redundant if we're fully offline
      if (dbErrorShownRef.current) {
        toast.dismiss('db-connection-error');
        dbErrorShownRef.current = false;
      }
      
      toast.error('You are offline. Some features may not work.', {
        id: 'connectivity-error',
        duration: Infinity,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for offline state on mount
    if (!navigator.onLine) {
      handleOffline();
    }

    /**
     * Monitor Supabase Realtime Connection
     */
    const channel = supabase.channel('connectivity-status');
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (dbErrorShownRef.current) {
          toast.dismiss('db-connection-error');
          dbErrorShownRef.current = false;
          toast.success('Database connection restored', { 
            duration: 3000,
            id: 'db-connection-restored'
          });
        }
        hasConnectedOnceRef.current = true;
      } else if (status === 'CLOSED' || status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        // Only show DB error if:
        // 1. We had successfully connected at least once (prevents errors during initial load handshake)
        // 2. We are online (internet is up)
        // 3. We haven't already shown the error
        if (hasConnectedOnceRef.current && isOnlineRef.current && !dbErrorShownRef.current) {
          dbErrorShownRef.current = true;
          toast.error('Connection to database lost. Retrying...', {
            id: 'db-connection-error',
            duration: Infinity,
          });
        }
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
