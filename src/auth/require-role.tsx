import { useAuth } from '@/auth/context/auth-context';
import { UserRole } from '@/auth/lib/models';
import { Navigate } from 'react-router-dom';
import { ScreenLoader } from '@/components/common/screen-loader';

interface RequireRoleProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Guard component that checks if the current user has one of the allowed roles.
 * Redirects to a specified path if the user doesn't have permission.
 */
export function RequireRole({
  allowedRoles,
  children,
  redirectTo = '/',
}: RequireRoleProps) {
  const { user, role, loading, isAutoSelecting } = useAuth();

  // Wait for auth to load or auto-selection to finish
  if (loading || isAutoSelecting) {
    return <ScreenLoader />;
  }

  // User must be authenticated
  if (!user || !role) {
    return <Navigate to="/auth/signin" replace />;
  }

  // Check if user has one of the allowed roles OR is an administrator (God-mode)
  if (!allowedRoles.includes(role) && role !== 'administrator') {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
