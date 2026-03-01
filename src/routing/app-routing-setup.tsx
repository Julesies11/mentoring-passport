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

const ProgramMemberDashboardPage = lazy(() => import('@/pages/dashboards/program-member-dashboard').then(m => ({ default: m.ProgramMemberDashboardPage })));
const TasksPage = lazy(() => import('@/pages/mentor/tasks-page').then(m => ({ default: m.TasksPage })));
const MentorMenteesPage = lazy(() => import('@/pages/mentor/mentees-page').then(m => ({ default: m.MentorMenteesPage })));
const MentorMeetingsPage = lazy(() => import('@/pages/mentor/meetings-page').then(m => ({ default: m.MentorMeetingsPage })));
const MentorNotesPage = lazy(() => import('@/pages/mentor/notes-page').then(m => ({ default: m.MentorNotesPage })));

const MenteeDashboardPage = lazy(() => import('@/pages/mentee/dashboard-page').then(m => ({ default: m.MenteeDashboardPage })));
const ChecklistPage = lazy(() => import('@/pages/mentee/checklist-page').then(m => ({ default: m.ChecklistPage })));
const MenteeMentorPage = lazy(() => import('@/pages/mentee/mentor-page').then(m => ({ default: m.MenteeMentorPage })));
const MenteeMeetingsPage = lazy(() => import('@/pages/mentee/meetings-page').then(m => ({ default: m.MenteeMeetingsPage })));
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
    case 'program-member':
    case 'mentor': // Fallback for transition
    case 'mentee': // Fallback for transition
      return <Navigate to="/program-member/dashboard" replace />;
    default:
      return <Navigate to="/auth/signin" replace />;
  }
}

// Program Member Route Switcher
function ProgramMemberRoute({ 
  mentorElement: MentorElement, 
  menteeElement: MenteeElement,
  requiresSingleRole = false
}: { 
  mentorElement: React.ElementType, 
  menteeElement: React.ElementType,
  requiresSingleRole?: boolean
}) {
  const { isMentor, isMentee } = useAuth();

  // If they have both roles, we might want a unified view or a switcher
  // For now, if they are a mentor, show that, otherwise show mentee
  if (isMentor) return <MentorElement />;
  if (isMentee) return <MenteeElement />;
  
  // If they have no active pairings yet, show mentee dashboard as default
  return <MenteeElement />;
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
            {/* ... other supervisor routes remain same ... */}
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

            {/* Program Member Unified Routes */}
            <Route
              path="/program-member/dashboard"
              element={
                <RequireRole allowedRoles={['program-member', 'mentor', 'mentee']}>
                  <ProgramMemberDashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="/program-member/tasks"
              element={
                <RequireRole allowedRoles={['program-member', 'mentor', 'mentee']}>
                  <TasksPage />
                </RequireRole>
              }
            />
            <Route
              path="/program-member/mentees"
              element={
                <RequireRole allowedRoles={['program-member', 'mentor', 'mentee']}>
                  <MentorMenteesPage />
                </RequireRole>
              }
            />
            <Route
              path="/program-member/mentor"
              element={
                <RequireRole allowedRoles={['program-member', 'mentor', 'mentee']}>
                  <MenteeMentorPage />
                </RequireRole>
              }
            />
            <Route
              path="/program-member/checklist"
              element={
                <RequireRole allowedRoles={['program-member', 'mentor', 'mentee']}>
                  <ChecklistPage />
                </RequireRole>
              }
            />
            <Route
              path="/program-member/meetings"
              element={
                <RequireRole allowedRoles={['program-member', 'mentor', 'mentee']}>
                  <ProgramMemberRoute 
                    mentorElement={MentorMeetingsPage} 
                    menteeElement={MenteeMeetingsPage} 
                  />
                </RequireRole>
              }
            />
            <Route
              path="/program-member/notes"
              element={
                <RequireRole allowedRoles={['program-member', 'mentor', 'mentee']}>
                  <ProgramMemberRoute 
                    mentorElement={MentorNotesPage} 
                    menteeElement={MenteeNotesPage} 
                  />
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
