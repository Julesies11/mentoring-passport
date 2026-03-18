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
  const { user, role, isSysAdmin, loading } = useAuth();

  // Wait for auth to load
  if (loading) {
    return <ScreenLoader />;
  }

  // User must be authenticated to have a role
  if (!user) {
    return <Navigate to="/auth/signin" replace />;
  }

  // If we have a user but no role, they shouldn't be here
  if (!role) {
    return <Navigate to="/auth/signin" replace />;
  }

  // Check if user has one of the allowed roles OR is a system administrator (God-mode)
  if (!allowedRoles.includes(role) && !isSysAdmin) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
