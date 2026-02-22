import { AuthRouting } from '@/auth/auth-routing';
import { RequireAuth } from '@/auth/require-auth';
import { RequireRole } from '@/auth/require-role';
import { useAuth } from '@/auth/context/auth-context';
import { ErrorRouting } from '@/errors/error-routing';
import { Demo1Layout } from '@/layouts/demo1/layout';
import { SupervisorDashboardPage } from '@/pages/supervisor/dashboard-page';
import { ParticipantsPage } from '@/pages/supervisor/participants-page';
import { PairsPage } from '@/pages/supervisor/pairs-page';
import { MentorDashboardPage } from '@/pages/mentor/dashboard-page';
import { TasksPage as MentorTasksPage } from '@/pages/mentor/tasks-page';
import { MenteeDashboardPage } from '@/pages/mentee/dashboard-page';
import { ChecklistPage } from '@/pages/mentee/checklist-page';
import { Navigate, Route, Routes } from 'react-router';

// Role-based redirect component
function RoleBasedRedirect() {
  const { role, loading } = useAuth();

  if (loading) {
    return null;
  }

  switch (role) {
    case 'supervisor':
      return <Navigate to="/supervisor/dashboard" replace />;
    case 'mentor':
      return <Navigate to="/mentor/dashboard" replace />;
    case 'mentee':
      return <Navigate to="/mentee/dashboard" replace />;
    default:
      return <Navigate to="/auth/signin" replace />;
  }
}

export function AppRoutingSetup() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<Demo1Layout />}>
          {/* Root redirects based on role */}
          <Route path="/" element={<RoleBasedRedirect />} />

          {/* Supervisor routes */}
          <Route
            path="/supervisor/dashboard"
            element={
              <RequireRole allowedRoles={['supervisor']}>
                <SupervisorDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/supervisor/participants"
            element={
              <RequireRole allowedRoles={['supervisor']}>
                <ParticipantsPage />
              </RequireRole>
            }
          />
          <Route
            path="/supervisor/pairs"
            element={
              <RequireRole allowedRoles={['supervisor']}>
                <PairsPage />
              </RequireRole>
            }
          />

          {/* Mentor routes */}
          <Route
            path="/mentor/dashboard"
            element={
              <RequireRole allowedRoles={['mentor']}>
                <MentorDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/mentor/tasks"
            element={
              <RequireRole allowedRoles={['mentor']}>
                <MentorTasksPage />
              </RequireRole>
            }
          />

          {/* Mentee routes */}
          <Route
            path="/mentee/dashboard"
            element={
              <RequireRole allowedRoles={['mentee']}>
                <MenteeDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/mentee/checklist"
            element={
              <RequireRole allowedRoles={['mentee']}>
                <ChecklistPage />
              </RequireRole>
            }
          />
        </Route>
      </Route>
      <Route path="error/*" element={<ErrorRouting />} />
      <Route path="auth/*" element={<AuthRouting />} />
      <Route path="*" element={<Navigate to="/error/404" />} />
    </Routes>
  );
}
