import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../notifications-service';
import * as notificationsApi from '../notifications';

// Mock the core notification API
vi.mock('../notifications', () => ({
  createNotification: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          if (table === 'mp_supervisor_programs') {
            return resolve({ 
              data: [{ user_id: 'supervisor-1' }, { user_id: 'supervisor-2' }], 
              error: null 
            });
          }
          if (table === 'mp_profiles') {
            return resolve({ 
              data: [{ id: 'supervisor-1' }, { id: 'supervisor-2' }], 
              error: null 
            });
          }
          return resolve({ data: [], error: null });
        }),
      })),
    }
  };
});

describe('NotificationService Single-Organisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Meetings', () => {
    it('notifies only the partner when a meeting is created', async () => {
      const mentorId = 'mentor-123';
      const menteeId = 'mentee-456';
      const actorId = mentorId; // Mentor creates meeting
      
      await NotificationService.notifyMeetingCreated({
        meetingId: 'meeting-1',
        title: 'Initial Chat',
        dateTime: new Date().toISOString(),
        mentorId,
        menteeId,
        mentorName: 'John Mentor',
        menteeName: 'Sarah Mentee',
        actorId
      });

      // Should only call createNotification ONCE (for the mentee)
      expect(notificationsApi.createNotification).toHaveBeenCalledTimes(1);
      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        menteeId,
        'meeting_created',
        'New Meeting with John Mentor',
        expect.stringContaining('New meeting scheduled: "Initial Chat"'),
        expect.stringContaining('id=meeting-1'),
        'meeting-1'
      );
    });
  });

  describe('Task Management', () => {
    it('notifies program supervisors when a task is re-opened', async () => {
      const actorId = 'mentor-1';
      
      await NotificationService.notifyTaskReopened({
        taskName: 'Site Visit',
        pairId: 'pair-1',
        programId: 'program-1',
        mentorName: 'John Mentor',
        menteeName: 'Sarah Mentee',
        actorId,
        actorName: 'John Mentor'
      });

      // Should call getProgramSupervisors(program-1)
      // The mock currently returns 2 supervisors
      expect(notificationsApi.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'supervisor-1',
        'note_added',
        'Task Re-opened: Site Visit',
        expect.stringContaining('John Mentor re-opened "Site Visit"'),
        expect.stringContaining('/supervisor/checklist?program=program-1&pair=pair-1'),
        'pair-1'
      );
    });
  });

  describe('Task Submissions', () => {
    it('notifies program supervisors AND the partner with distinct messages', async () => {
      const mentorId = 'mentor-1';
      const menteeId = 'mentee-1';
      const actorId = menteeId; // Mentee submits task
      
      await NotificationService.notifyTaskSubmitted({
        taskId: 'task-1',
        taskName: 'Site Visit',
        pairId: 'pair-1',
        programId: 'program-1',
        mentorId,
        menteeId,
        mentorName: 'John Mentor',
        menteeName: 'Sarah Mentee',
        actorId,
        actorName: 'Sarah Mentee'
      });

      // Total calls = 2 (supervisors) + 1 (partner) = 3
      expect(notificationsApi.createNotification).toHaveBeenCalledTimes(3);

      // Check Supervisor Notification
      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'supervisor-1',
        'task_submitted',
        'Review Required: Site Visit',
        expect.stringContaining('Sarah Mentee submitted evidence for "Site Visit"'),
        expect.stringContaining('/supervisor/evidence-review?program=program-1&pairId=pair-1'),
        'pair-1'
      );

      // Check Partner Notification (Mentor)
      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        mentorId,
        'task_submitted',
        'Task Submitted by Sarah Mentee',
        expect.stringContaining('Sarah Mentee submitted "Site Visit" for supervisor review'),
        expect.stringContaining('/program-member/tasks?pair=pair-1&taskId=task-1'),
        'pair-1'
      );
    });
  });

  describe('Peer-to-Peer Task Alerts', () => {
    const mentorId = 'mentor-1';
    const menteeId = 'mentee-1';
    const pairId = 'pair-1';

    it('notifies partner when peer completes a task', async () => {
      await NotificationService.notifyTaskCompleted({
        taskId: 'task-1',
        taskName: 'Profile Setup',
        pairId,
        mentorId,
        menteeId,
        actorId: menteeId,
        actorName: 'Sarah Mentee'
      });

      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        mentorId,
        'task_completed',
        'Task Completed by Sarah Mentee',
        expect.stringContaining('Sarah Mentee marked "Profile Setup" as completed'),
        expect.stringContaining('pair=pair-1&taskId=task-1'),
        'task-1'
      );
    });

    it('notifies partner when peer re-opens a task', async () => {
      await NotificationService.notifyTaskReopenedByPeer({
        taskId: 'task-1',
        taskName: 'Profile Setup',
        pairId,
        mentorId,
        menteeId,
        actorId: mentorId,
        actorName: 'John Mentor'
      });

      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        menteeId,
        'note_added',
        'Task Re-opened by John Mentor',
        expect.stringContaining('John Mentor has re-opened "Profile Setup"'),
        expect.stringContaining('pair=pair-1&taskId=task-1'),
        'task-1'
      );
    });

    it('notifies partner when peer adds a note', async () => {
      await NotificationService.notifyTaskNoteAdded({
        taskId: 'task-1',
        taskName: 'Site Visit',
        pairId,
        mentorId,
        menteeId,
        actorId: menteeId,
        actorName: 'Sarah Mentee',
        noteSnippet: 'Looking forward to this!'
      });

      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        mentorId,
        'note_added',
        'New Note from Sarah Mentee',
        expect.stringContaining('Sarah Mentee added a note to "Site Visit"'),
        expect.stringContaining('pair=pair-1&taskId=task-1'),
        'task-1'
      );
    });
  });

  describe('Supervisor Administration Alerts', () => {
    it('notifies supervisors when a participant profile is ready', async () => {
      await NotificationService.notifyParticipantProfileReady({
        profileId: 'user-new',
        fullName: 'New Joiner',
        actorId: 'user-new'
      });

      // Should notify all supervisors (mock returns 2)
      expect(notificationsApi.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'supervisor-1',
        'profile_completed',
        'New Participant Onboarded',
        expect.stringContaining('New Joiner has completed their profile'),
        expect.stringContaining('id=user-new'),
        'user-new'
      );
    });

    it('notifies supervisors when a new pair is matched', async () => {
      await NotificationService.notifyPairCreated({
        pairId: 'pair-99',
        programId: 'prog-1',
        programName: 'Leadership 2026',
        mentorName: 'Alice Mentor',
        menteeName: 'Bob Mentee',
        actorId: 'admin-user'
      });

      // Should notify scoped supervisors (mock returns 2)
      expect(notificationsApi.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'supervisor-1',
        'pair_created',
        'New Pair Matched',
        expect.stringContaining('Alice Mentor and Bob Mentee'),
        expect.stringContaining('/supervisor/pairs?program=prog-1&pairId=pair-99'),
        'pair-99'
      );
    });
  });

  describe('Org Admin Oversight Alerts', () => {
    it('notifies org admins when a user is promoted to supervisor', async () => {
      await NotificationService.notifyRoleUpdated({
        userId: 'user-123',
        userName: 'John Staff',
        newRole: 'supervisor',
        actorId: 'admin-id',
        actorName: 'Global Admin'
      });

      // Should notify org admins (mock returns 2 from mp_profiles)
      expect(notificationsApi.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'supervisor-1',
        'system_error',
        'Security: Role Updated',
        expect.stringContaining('granted the "supervisor" role'),
        expect.stringContaining('id=user-123'),
        'user-123'
      );
    });

    it('notifies org admins when a program is ending', async () => {
      await NotificationService.notifyProgramEndingSoon({
        programId: 'prog-1',
        programName: 'Summer Cohort',
        endDate: '2026-08-01'
      });

      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'supervisor-1',
        'stagnation_alert',
        'Program Ending Soon',
        expect.stringContaining('Summer Cohort'),
        expect.stringContaining('/supervisor/org-settings?program=prog-1'),
        'prog-1'
      );
    });

    it('notifies org admins when a full program completes', async () => {
      await NotificationService.notifyProgramCompleted({
        programId: 'prog-1',
        programName: 'Leadership 2026'
      });

      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'supervisor-1',
        'pair_completed',
        'Program Successfully Completed!',
        expect.stringContaining('Leadership 2026'),
        expect.stringContaining('/supervisor/dashboard?program=prog-1'),
        'prog-1'
      );
    });
  });

  describe('Milestones and Feedback', () => {
    it('notifies supervisors when a pair reaches 50%', async () => {
      await NotificationService.notifyMilestone({
        type: 'milestone_50',
        pairId: 'pair-1',
        programId: 'prog-1',
        mentorName: 'Alice',
        menteeName: 'Bob',
        actorId: 'bob-id',
        actorName: 'Bob'
      });

      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'supervisor-1',
        'milestone_50',
        '50% Milestone Reached',
        expect.stringContaining('halfway through'),
        expect.stringContaining('/supervisor/pairs?program=prog-1&pairId=pair-1'),
        'pair-1'
      );
    });

    it('notifies both partners when a task is approved', async () => {
      await NotificationService.notifyTaskReviewed({
        taskId: 'task-1',
        taskName: 'Site Visit',
        pairId: 'pair-1',
        status: 'approved',
        feedback: 'Great job',
        submitterId: 'mentee-1',
        partnerId: 'mentor-1',
        partnerName: 'John Mentor',
        actorId: 'supervisor-1'
      });

      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'mentee-1',
        'evidence_approved',
        'Task Approved',
        expect.stringContaining('Your submission for "Site Visit" was approved'),
        expect.stringContaining('pair=pair-1&taskId=task-1'),
        'task-1'
      );

      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'mentor-1',
        'evidence_approved',
        'Pair Progress: Approved',
        expect.stringContaining('approved the submission for "Site Visit"'),
        expect.stringContaining('pair=pair-1&taskId=task-1'),
        'task-1'
      );
    });
  });

  describe('System and Reliability', () => {
    it('notifies system admins of critical errors', async () => {
      // We need to mock the role filter for this test
      await NotificationService.notifyCriticalError('err-123', 'Database connection failed');

      // The mock returns 2 users from mp_profiles
      expect(notificationsApi.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'supervisor-1', // Mock uses same IDs for profiles
        'system_error',
        'Critical System Error',
        expect.stringContaining('Error Logged: Database connection failed'),
        expect.stringContaining('id=err-123'),
        'err-123'
      );
    });
  });
});
