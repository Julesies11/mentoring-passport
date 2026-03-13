import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/auth-context';
import { ScreenLoader } from '@/components/common/screen-loader';

/**
 * Guard component that ensures a user has an active organization context
 * before allowing them to access protected application routes.
 */
export const RequireOrganisation = () => {
  const { memberships, activeMembership, isSystemOwner, loading, isAutoSelecting } = useAuth();
  const location = useLocation();

  if (loading || isAutoSelecting) {
    return <ScreenLoader />;
  }

  // 1. System Owners are global and don't require an active membership to enter the app
  if (isSystemOwner) {
    return <Outlet />;
  }

  // 2. If the user has multiple memberships but hasn't selected one yet, 
  // force them to the selection screen.
  if (memberships.length > 1 && !activeMembership) {
    // Prevent infinite redirect if we are already on the selection page
    if (location.pathname.includes('/auth/select-organisation')) {
      return <Outlet />;
    }
    
    return <Navigate to="/auth/select-organisation" replace />;
  }

  // 3. If they have no memberships at all, force to selection screen 
  // (which has a friendly empty state message)
  if (memberships.length === 0) {
    if (location.pathname.includes('/auth/select-organisation')) {
      return <Outlet />;
    }
    return <Navigate to="/auth/select-organisation" replace />;
  }

  // 4. Otherwise, they either have a single org (auto-selected) or have already picked one.
  return <Outlet />;
};
