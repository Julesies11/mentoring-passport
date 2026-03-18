import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ScreenLoader } from '@/components/common/screen-loader';
import { useAuth } from './context/auth-context';

/**
 * Component to protect routes that require authentication.
 * If user is not authenticated, redirects to the login page.
 */
export const RequireAuth = () => {
  const { loading, user } = useAuth();
  const location = useLocation();

  // 1. Show global screen loader while the AuthProvider is determining state
  if (loading) {
    return <ScreenLoader />;
  }

  // 2. If NOT loading and NO user, they must sign in
  if (!user) {
    return (
      <Navigate
        to={`/auth/signin?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // 3. If authenticated and user is present, render child routes
  return <Outlet />;
};
