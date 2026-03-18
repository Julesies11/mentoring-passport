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
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Connectivity: Internet connection restored');
      isOnlineRef.current = true;
      toast.dismiss('connectivity-error');
      
      toast.success('Internet connection restored', { 
        duration: 3000,
        id: 'connectivity-restored'
      });
    };

    const handleOffline = () => {
      console.warn('Connectivity: Internet connection lost');
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
    
    // Set a timeout to show an error if we can't connect within 15 seconds on initial load
    connectionTimeoutRef.current = setTimeout(() => {
      if (!hasConnectedOnceRef.current && isOnlineRef.current && !dbErrorShownRef.current) {
        dbErrorShownRef.current = true;
        toast.error('Initial connection to database is slow. Still trying...', {
          id: 'db-connection-error',
          duration: Infinity,
        });
      }
    }, 15000);

    channel.subscribe((status) => {
      console.log(`Connectivity: Realtime status change: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        if (dbErrorShownRef.current) {
          toast.dismiss('db-connection-error');
          dbErrorShownRef.current = false;
          
          // Only show "restored" if we had a successful connection before it dropped
          if (hasConnectedOnceRef.current) {
            toast.success('Database connection restored', { 
              duration: 3000,
              id: 'db-connection-restored'
            });
          }
        }
        hasConnectedOnceRef.current = true;
      } else if (status === 'CLOSED' || status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        // Show DB error if we are online (internet is up) but DB connection is down
        if (isOnlineRef.current && !dbErrorShownRef.current) {
          dbErrorShownRef.current = true;
          toast.error(hasConnectedOnceRef.current ? 'Connection to database lost. Retrying...' : 'Could not connect to database. Retrying...', {
            id: 'db-connection-error',
            duration: Infinity,
          });
        }
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
