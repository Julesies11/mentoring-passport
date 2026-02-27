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

const MentorDashboardPage = lazy(() => import('@/pages/mentor/dashboard-page').then(m => ({ default: m.MentorDashboardPage })));
const MentorTasksPage = lazy(() => import('@/pages/mentor/tasks-page').then(m => ({ default: m.TasksPage })));
const MentorMenteesPage = lazy(() => import('@/pages/mentor/mentees-page').then(m => ({ default: m.MentorMenteesPage })));
const MentorMeetingsPage = lazy(() => import('@/pages/mentor/meetings-page').then(m => ({ default: m.MentorMeetingsPage })));
const MentorEvidencePage = lazy(() => import('@/pages/mentor/evidence-page').then(m => ({ default: m.MentorEvidencePage })));
const MentorNotesPage = lazy(() => import('@/pages/mentor/notes-page').then(m => ({ default: m.MentorNotesPage })));

const MenteeDashboardPage = lazy(() => import('@/pages/mentee/dashboard-page').then(m => ({ default: m.MenteeDashboardPage })));
const ChecklistPage = lazy(() => import('@/pages/mentee/checklist-page').then(m => ({ default: m.ChecklistPage })));
const MenteeMentorPage = lazy(() => import('@/pages/mentee/mentor-page').then(m => ({ default: m.MenteeMentorPage })));
const MenteeMeetingsPage = lazy(() => import('@/pages/mentee/meetings-page').then(m => ({ default: m.MenteeMeetingsPage })));
const MenteeEvidencePage = lazy(() => import('@/pages/mentee/evidence-page').then(m => ({ default: m.MenteeEvidencePage })));
const MenteeNotesPage = lazy(() => import('@/pages/mentee/notes-page').then(m => ({ default: m.MenteeNotesPage })));

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
            <Route
              path="/mentor/mentees"
              element={
                <RequireRole allowedRoles={['mentor']}>
                  <MentorMenteesPage />
                </RequireRole>
              }
            />
            <Route
              path="/mentor/meetings"
              element={
                <RequireRole allowedRoles={['mentor']}>
                  <MentorMeetingsPage />
                </RequireRole>
              }
            />
            <Route
              path="/mentor/evidence"
              element={
                <RequireRole allowedRoles={['mentor']}>
                  <MentorEvidencePage />
                </RequireRole>
              }
            />
            <Route
              path="/mentor/notes"
              element={
                <RequireRole allowedRoles={['mentor']}>
                  <MentorNotesPage />
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
            <Route
              path="/mentee/mentor"
              element={
                <RequireRole allowedRoles={['mentee']}>
                  <MenteeMentorPage />
                </RequireRole>
              }
            />
            <Route
              path="/mentee/meetings"
              element={
                <RequireRole allowedRoles={['mentee']}>
                  <MenteeMeetingsPage />
                </RequireRole>
              }
            />
            <Route
              path="/mentee/evidence"
              element={
                <RequireRole allowedRoles={['mentee']}>
                  <MenteeEvidencePage />
                </RequireRole>
              }
            />
            <Route
              path="/mentee/notes"
              element={
                <RequireRole allowedRoles={['mentee']}>
                  <MenteeNotesPage />
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
