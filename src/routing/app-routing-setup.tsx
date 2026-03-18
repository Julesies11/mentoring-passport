import { AuthRouting } from '@/auth/auth-routing';
import { RequireAuth } from '@/auth/require-auth';
import { RequireRole } from '@/auth/require-role';
import { useAuth } from '@/auth/context/auth-context';
import { Demo1Layout } from '@/layouts/demo1';
import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ScreenLoader } from '@/components/common/screen-loader';
import { ContentLoader } from '@/components/common/content-loader';

// --- PAGE IMPORTS (Lazy Loaded for performance) ---

// System Administrator Pages
const SysAdminDashboardPage = lazy(() => import('@/pages/admin/dashboard').then(m => ({ default: m.AdminDashboardPage })));
const SysAdminInstanceSettingsPage = lazy(() => import('@/pages/org-admin/settings').then(m => ({ default: m.OrgSettingsPage })));
const SysAdminUsersPage = lazy(() => import('@/pages/admin/users').then(m => ({ default: m.AdminUsersPage })));

// Organisation Administrator Pages
const OrgAdminDashboardPage = lazy(() => import('@/pages/org-admin/dashboard').then(m => ({ default: m.OrgAdminDashboardPage })));
const OrgAdminProgramsPage = lazy(() => import('@/pages/org-admin/programs').then(m => ({ default: m.OrgAdminProgramsPage })));
const OrgAdminPairsPage = lazy(() => import('@/pages/org-admin/pairs-page').then(m => ({ default: m.OrgAdminPairsPage })));
const ParticipantsPage = lazy(() => import('@/pages/supervisor/participants-page').then(m => ({ default: m.ParticipantsPage })));
const TaskTemplatesLibraryPage = lazy(() => import('@/pages/org-admin/task-templates').then(m => ({ default: m.TaskTemplatesLibraryPage })));
const TaskTemplateEditorPage = lazy(() => import('@/pages/org-admin/task-templates').then(m => ({ default: m.TaskTemplateEditorPage })));
const ManageSupervisorsPage = lazy(() => import('@/pages/org-admin/supervisors').then(m => ({ default: m.ManageSupervisorsPage })));
const EvidenceAuditPage = lazy(() => import('@/pages/org-admin/evidence-audit-page').then(m => ({ default: m.EvidenceAuditPage })));

// Supervisor Pages
const SupervisorDashboardPage = lazy(() => import('@/pages/supervisor/dashboard-page').then(m => ({ default: m.SupervisorDashboardPage })));
const PairsPage = lazy(() => import('@/pages/supervisor/pairs-page').then(m => ({ default: m.PairsPage })));
const SupervisorProgramTasksPage = lazy(() => import('@/pages/supervisor/program-tasks-page').then(m => ({ default: m.SupervisorProgramTasksPage })));
const EvidenceReviewPage = lazy(() => import('@/pages/supervisor/evidence-review-page').then(m => ({ default: m.EvidenceReviewPage })));
const SupervisorCalendarPage = lazy(() => import('@/pages/supervisor/calendar-page').then(m => ({ default: m.SupervisorCalendarPage })));
const SupervisorChecklistPage = lazy(() => import('@/pages/supervisor/checklist-page').then(m => ({ default: m.SupervisorChecklistPage })));
const SupervisorErrorLogsPage = lazy(() => import('@/pages/supervisor/error-logs-page').then(m => ({ default: m.SupervisorErrorLogsPage })));

// Program Member Pages
const ProgramMemberDashboardPage = lazy(() => import('@/pages/dashboards/program-member-dashboard').then(m => ({ default: m.ProgramMemberDashboardPage })));
const ProgramMemberTasksPage = lazy(() => import('@/pages/program-member/tasks-page').then(m => ({ default: m.ProgramMemberTasksPage })));
const RelationshipPage = lazy(() => import('@/pages/program-member/relationship-page').then(m => ({ default: m.ProgramMemberRelationshipPage })));
const ProgramMemberMeetingsPage = lazy(() => import('@/pages/program-member/meetings-page').then(m => ({ default: m.ProgramMemberMeetingsPage })));

// Profile Pages
const EditProfilePage = lazy(() => import('@/pages/profile').then(m => ({ default: m.EditProfilePage })));

// Error Pages
const ErrorRouting = lazy(() => import('@/errors/error-routing').then(m => ({ default: m.ErrorRouting })));

/**
 * A wrapper that provides a Suspense boundary for inner routes
 */
const SuspenseLayout = () => (
  <Suspense fallback={<ContentLoader />}>
    <Outlet />
  </Suspense>
);

// Role-based redirect component
function RoleBasedRedirect() {
  const { role, loading } = useAuth();

  if (loading) {
    return <ScreenLoader />;
  }

  // Route to role-specific landing page
  switch (role) {
    case 'administrator':
      return <Navigate to="/sys-admin/dashboard" replace />;
    case 'org-admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'supervisor':
      return <Navigate to="/supervisor/hub" replace />;
    case 'program-member':
      return <Navigate to="/program-member/dashboard" replace />;
    default:
      return <Navigate to="/error/404" replace />;
  }
}

export function AppRoutingSetup() {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <Routes>
        <Route element={<RequireAuth />}>
          {/* APPLICATION SHELL (Persistent Sidebar/Header) */}
          <Route element={<Demo1Layout />}>
            {/* Landing handles redirection within the active context */}
            <Route index element={<RoleBasedRedirect />} />
            
            <Route element={<SuspenseLayout />}>
              {/* System Administrator Routes */}
              <Route
                path="/sys-admin/dashboard"
                element={
                  <RequireRole allowedRoles={['administrator']}>
                    <SysAdminDashboardPage />
                  </RequireRole>
                }
              />
              <Route
                path="/sys-admin/settings"
                element={
                  <RequireRole allowedRoles={['administrator']}>
                    <SysAdminInstanceSettingsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/sys-admin/users"
                element={
                  <RequireRole allowedRoles={['administrator']}>
                    <SysAdminUsersPage />
                  </RequireRole>
                }
              />

              {/* Organisation Administrator Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <OrgAdminDashboardPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/programs"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <OrgAdminProgramsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/pairs"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <OrgAdminPairsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/participants"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <ParticipantsPage mode="manage" />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/task-templates"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <TaskTemplatesLibraryPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/task-templates/:id"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <TaskTemplateEditorPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/supervisors"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <ManageSupervisorsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/evidence-audit"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <EvidenceAuditPage />
                  </RequireRole>
                }
              />

              {/* Supervisor routes */}
              <Route
                path="/supervisor/hub"
                element={
                  <RequireRole allowedRoles={['supervisor', 'org-admin']}>
                    <SupervisorDashboardPage />
                  </RequireRole>
                }
              />
              <Route
                path="/supervisor/dashboard"
                element={<Navigate to="/supervisor/hub" replace />}
              />
              <Route
                path="/supervisor/pairs"
                element={
                  <RequireRole allowedRoles={['supervisor', 'org-admin']}>
                    <PairsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/supervisor/program-tasks"
                element={
                  <RequireRole allowedRoles={['supervisor', 'org-admin']}>
                    <SupervisorProgramTasksPage /> 
                  </RequireRole>
                }
              />
              <Route
                path="/supervisor/evidence-review"
                element={
                  <RequireRole allowedRoles={['supervisor', 'org-admin']}>
                    <EvidenceReviewPage />
                  </RequireRole>
                }
              />
              <Route
                path="/supervisor/calendar"
                element={
                  <RequireRole allowedRoles={['supervisor', 'org-admin']}>
                    <SupervisorCalendarPage />
                  </RequireRole>
                }
              />
              <Route
                path="/supervisor/checklist"
                element={
                  <RequireRole allowedRoles={['supervisor', 'org-admin']}>
                    <SupervisorChecklistPage />
                  </RequireRole>
                }
              />
              <Route
                path="/supervisor/error-logs"
                element={
                  <RequireRole allowedRoles={['supervisor', 'org-admin']}>
                    <SupervisorErrorLogsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/supervisor/participants"
                element={
                  <RequireRole allowedRoles={['supervisor', 'org-admin']}>
                    <ParticipantsPage mode="view" />
                  </RequireRole>
                }
              />

              {/* Program Member Unified Routes */}
              <Route
                path="/program-member/dashboard"
                element={
                  <RequireRole allowedRoles={['program-member']}>
                    <ProgramMemberDashboardPage />
                  </RequireRole>
                }
              />
              <Route
                path="/program-member/tasks"
                element={
                  <RequireRole allowedRoles={['program-member']}>
                    <ProgramMemberTasksPage />
                  </RequireRole>
                }
              />
              <Route
                path="/program-member/mentees"
                element={
                  <RequireRole allowedRoles={['program-member']}>
                    <RelationshipPage />
                  </RequireRole>
                }
              />
              <Route
                path="/program-member/mentor"
                element={
                  <RequireRole allowedRoles={['program-member']}>
                    <RelationshipPage />
                  </RequireRole>
                }
              />
              <Route
                path="/program-member/checklist"
                element={
                  <RequireRole allowedRoles={['program-member']}>
                    <Navigate to="/program-member/tasks" replace />
                  </RequireRole>
                }
              />
              <Route
                path="/program-member/meetings"
                element={
                  <RequireRole allowedRoles={['program-member']}>
                    <ProgramMemberMeetingsPage />
                  </RequireRole>
                }
              />

              {/* Profile routes - available to all authenticated users */}
              <Route
                path="/profile/edit"
                element={<EditProfilePage />}
              />
            </Route>
          </Route>
        </Route>
        <Route path="error/*" element={<ErrorRouting />} />
        <Route path="auth/*" element={<AuthRouting />} />
        <Route path="*" element={<Navigate to="/error/404" />} />
      </Routes>
    </Suspense>
  );
}
