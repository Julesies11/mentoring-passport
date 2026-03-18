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

  const location = useLocation();
  const path = location.pathname.trim();

  useEffect(() => {
    // Scroll to top on navigation
    if (!CSS.escape(window.location.hash)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [path]);

  return <AppRoutingSetup />;
}
