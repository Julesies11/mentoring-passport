import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useLocation } from 'react-router-dom';
import { useLoadingBar } from 'react-top-loading-bar';
import { AppRoutingSetup } from './app-routing-setup';

export function AppRouting() {
  const { start, complete } = useLoadingBar({
    color: 'var(--color-primary)',
    shadow: false,
    waitingTime: 400,
    transitionTime: 200,
    height: 2,
  });

  const { verify, loading: authLoading } = useAuth();
  const [previousLocation, setPreviousLocation] = useState('');
  const location = useLocation();
  const path = location.pathname.trim();

  // Navigation listener for background verification
  const handleNavigation = useCallback(async () => {
    // Only run if we aren't already in an initial global loading state
    if (!authLoading) {
      start('static');
      try {
        // verify(false) is silent - it doesn't trigger the global ScreenLoader
        await verify(false);
      } catch (error) {
        console.error('AppRouting: Background verification failed:', error);
      } finally {
        setPreviousLocation(path);
        complete();
      }
    }
  }, [authLoading, verify, path, start, complete]);

  useEffect(() => {
    handleNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  useEffect(() => {
    if (!CSS.escape(window.location.hash)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [previousLocation]);

  return <AppRoutingSetup />;
}
