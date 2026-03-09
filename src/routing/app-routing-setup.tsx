import { AuthRouting } from '@/auth/auth-routing';
import { RequireAuth } from '@/auth/require-auth';
import { RequireRole } from '@/auth/require-role';
import { useAuth } from '@/auth/context/auth-context';
import { ErrorRouting } from '@/errors/error-routing';
import { Demo1Layout } from '@/layouts/demo1/layout';
import { Navigate, Route, Routes } from 'react-router';
import { lazy, Suspense } from 'react';

// Lazy load pages
const SupervisorDashboardPage = lazy(() => import('@/pages/supervisor/dashboard-page').then(m => ({ default: m.SupervisorDashboardPage })));
const ParticipantsPage = lazy(() => import('@/pages/supervisor/participants-page').then(m => ({ default: m.ParticipantsPage })));
const PairsPage = lazy(() => import('@/pages/supervisor/pairs-page').then(m => ({ default: m.PairsPage })));
const SupervisorMasterTasksPage = lazy(() => import('@/pages/supervisor/master-tasks-page').then(m => ({ default: m.SupervisorMasterTasksPage })));
const EvidenceReviewPage = lazy(() => import('@/pages/supervisor/evidence-review-page').then(m => ({ default: m.EvidenceReviewPage })));
const SupervisorCalendarPage = lazy(() => import('@/pages/supervisor/calendar-page').then(m => ({ default: m.SupervisorCalendarPage })));
const SupervisorChecklistPage = lazy(() => import('@/pages/supervisor/checklist-page').then(m => ({ default: m.SupervisorChecklistPage })));
const SupervisorErrorLogsPage = lazy(() => import('@/pages/supervisor/error-logs-page').then(m => ({ default: m.SupervisorErrorLogsPage })));

const ProgramMemberDashboardPage = lazy(() => import('@/pages/dashboards/program-member-dashboard').then(m => ({ default: m.ProgramMemberDashboardPage })));
const ProgramMemberTasksPage = lazy(() => import('@/pages/program-member').then(m => ({ default: m.ProgramMemberTasksPage })));
const ProgramMemberMeetingsPage = lazy(() => import('@/pages/program-member').then(m => ({ default: m.ProgramMemberMeetingsPage })));
const ProgramMemberNotesPage = lazy(() => import('@/pages/program-member').then(m => ({ default: m.ProgramMemberNotesPage })));
const RelationshipPage = lazy(() => import('@/pages/program-member').then(m => ({ default: m.ProgramMemberRelationshipPage })));

const EditProfilePage = lazy(() => import('@/pages/profile/edit-profile').then(m => ({ default: m.EditProfilePage })));

// Loading component for suspense
const PageLoading = () => null;

// Role-based redirect component
function RoleBasedRedirect() {
  const { role, loading } = useAuth();

  if (loading) {
    return null;
  }

  switch (role) {
    case 'supervisor':
      return <Navigate to="/supervisor/dashboard" replace />;
    case 'program-member':
      return <Navigate to="/program-member/dashboard" replace />;
    default:
      return <Navigate to="/auth/signin" replace />;
  }
}

export function AppRoutingSetup() {
  return (
    <Suspense fallback={<PageLoading />}>
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
            <Route
              path="/supervisor/master-tasks"
              element={
                <RequireRole allowedRoles={['supervisor']}>
                  <SupervisorMasterTasksPage />
                </RequireRole>
              }
            />
            <Route
              path="/supervisor/evidence-review"
              element={
                <RequireRole allowedRoles={['supervisor']}>
                  <EvidenceReviewPage />
                </RequireRole>
              }
            />
            <Route
              path="/supervisor/calendar"
              element={
                <RequireRole allowedRoles={['supervisor']}>
                  <SupervisorCalendarPage />
                </RequireRole>
              }
            />
            <Route
              path="/supervisor/checklist"
              element={
                <RequireRole allowedRoles={['supervisor']}>
                  <SupervisorChecklistPage />
                </RequireRole>
              }
            />
            <Route
              path="/supervisor/error-logs"
              element={
                <RequireRole allowedRoles={['supervisor']}>
                  <SupervisorErrorLogsPage />
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
            <Route
              path="/program-member/notes"
              element={
                <RequireRole allowedRoles={['program-member']}>
                  <ProgramMemberNotesPage />
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
        <Route path="error/*" element={<ErrorRouting />} />
        <Route path="auth/*" element={<AuthRouting />} />
        <Route path="*" element={<Navigate to="/error/404" />} />
      </Routes>
    </Suspense>
  );
}
