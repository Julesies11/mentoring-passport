import { AuthRouting } from '@/auth/auth-routing';
import { RequireAuth } from '@/auth/require-auth';
import { RequireRole } from '@/auth/require-role';
import { RequireOrganisation } from '@/auth/require-organisation';
import { useAuth } from '@/auth/context/auth-context';
import { ErrorRouting } from '@/errors/error-routing';
import { Demo1Layout } from '@/layouts/demo1/layout';
import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// Lazy load pages
const SupervisorDashboardPage = lazy(() => import('@/pages/supervisor').then(m => ({ default: m.SupervisorDashboardPage })));
const ParticipantsPage = lazy(() => import('@/pages/supervisor').then(m => ({ default: m.ParticipantsPage })));
const PairsPage = lazy(() => import('@/pages/supervisor').then(m => ({ default: m.PairsPage })));
const SupervisorProgramTasksPage = lazy(() => import('@/pages/supervisor').then(m => ({ default: m.SupervisorProgramTasksPage })));
const EvidenceReviewPage = lazy(() => import('@/pages/supervisor').then(m => ({ default: m.EvidenceReviewPage })));
const SupervisorCalendarPage = lazy(() => import('@/pages/supervisor').then(m => ({ default: m.SupervisorCalendarPage })));
const SupervisorChecklistPage = lazy(() => import('@/pages/supervisor').then(m => ({ default: m.SupervisorChecklistPage })));
const SupervisorErrorLogsPage = lazy(() => import('@/pages/supervisor').then(m => ({ default: m.SupervisorErrorLogsPage })));

const ProgramMemberDashboardPage = lazy(() => import('@/pages/dashboards/program-member-dashboard').then(m => ({ default: m.ProgramMemberDashboardPage })));
const ProgramMemberTasksPage = lazy(() => import('@/pages/program-member').then(m => ({ default: m.ProgramMemberTasksPage })));
const ProgramMemberMeetingsPage = lazy(() => import('@/pages/program-member').then(m => ({ default: m.ProgramMemberMeetingsPage })));
const RelationshipPage = lazy(() => import('@/pages/program-member').then(m => ({ default: m.ProgramMemberRelationshipPage })));

const EditProfilePage = lazy(() => import('@/pages/profile/edit-profile').then(m => ({ default: m.EditProfilePage })));

// Admin Pages
const AdminDashboardPage = lazy(() => import('@/pages/admin/dashboard').then(m => ({ default: m.AdminDashboardPage })));
const AdminOrganisationsPage = lazy(() => import('@/pages/admin/organisations').then(m => ({ default: m.AdminOrganisationsPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/users').then(m => ({ default: m.AdminUsersPage })));

// Org Admin Pages
const OrgAdminDashboardPage = lazy(() => import('@/pages/org-admin/dashboard').then(m => ({ default: m.OrgAdminDashboardPage })));
const OrgAdminProgramsPage = lazy(() => import('@/pages/org-admin/programs').then(m => ({ default: m.OrgAdminProgramsPage })));
const TaskTemplatesLibraryPage = lazy(() => import('@/pages/org-admin/task-templates').then(m => ({ default: m.TaskTemplatesLibraryPage })));

const TaskTemplateEditorPage = lazy(() => import('@/pages/org-admin/task-templates').then(m => ({ default: m.TaskTemplateEditorPage })));
const ManageSupervisorsPage = lazy(() => import('@/pages/org-admin/supervisors').then(m => ({ default: m.ManageSupervisorsPage })));

// Loading component for suspense
const PageLoading = () => null;

// Role-based redirect component
function RoleBasedRedirect() {
  const { role, loading, memberships, activeMembership, isSystemOwner, isAutoSelecting } = useAuth();

  if (loading || isAutoSelecting) {
    return <PageLoading />;
  }

  // 1. System Owners always go to Admin Dashboard (they see everything)
  if (isSystemOwner) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // 2. If user has exactly 1 membership but no active context yet, auto-select is running in AuthProvider
  if (memberships.length === 1 && !activeMembership) {
    return <PageLoading />;
  }

  // 3. If user has multiple memberships (or none) and no active context selected, send to selection screen
  if (memberships.length !== 1 && !activeMembership) {
    return <Navigate to="/auth/select-organisation" replace />;
  }

  // 4. Normal role routing
  switch (role) {
    case 'administrator':
      return <Navigate to="/admin/dashboard" replace />;
    case 'org-admin':
      return <Navigate to="/org-admin/hub" replace />;
    case 'supervisor':
      return <Navigate to="/supervisor/hub" replace />;
    case 'program-member':
      return <Navigate to="/program-member/dashboard" replace />;
    default:
      // Fallback: if we have an active membership, route based on that role
      if (activeMembership) {
        if (activeMembership.role === 'org-admin') return <Navigate to="/org-admin/hub" replace />;
        if (activeMembership.role === 'supervisor') return <Navigate to="/supervisor/hub" replace />;
        return <Navigate to="/program-member/dashboard" replace />;
      }
      return <Navigate to="/error/404" replace />;
  }
}

export function AppRoutingSetup() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route element={<RequireOrganisation />}>
            {/* Initial landing handles redirection/selection */}
            <Route index element={<RoleBasedRedirect />} />

            {/* Application routes protected by Demo1Layout */}
            <Route element={<Demo1Layout />}>
              {/* Administrator routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <RequireRole allowedRoles={['administrator']}>
                    <AdminDashboardPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/organisations"
                element={
                  <RequireRole allowedRoles={['administrator']}>
                    <AdminOrganisationsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RequireRole allowedRoles={['administrator']}>
                    <AdminUsersPage />
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

              {/* Org Admin Specific Routes */}
              <Route
                path="/org-admin/hub"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <OrgAdminDashboardPage />
                  </RequireRole>
                }
              />
              <Route
                path="/org-admin/dashboard"
                element={<Navigate to="/org-admin/hub" replace />}
              />
              <Route
                path="/org-admin/programs"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <OrgAdminProgramsPage />
                  </RequireRole>
                }
              />
              <Route
                path="/org-admin/participants"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <ParticipantsPage mode="manage" />
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
              <Route
                path="/org-admin/task-templates"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <TaskTemplatesLibraryPage />
                  </RequireRole>
                }
              />
              <Route
                path="/org-admin/task-templates/:id"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <TaskTemplateEditorPage />
                  </RequireRole>
                }
              />
              <Route
                path="/org-admin/supervisors"
                element={
                  <RequireRole allowedRoles={['org-admin']}>
                    <ManageSupervisorsPage />
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
