import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../notifications-service';
import * as notificationsApi from '../notifications';

// Mock the core notification API
vi.mock('../notifications', () => ({
  createNotification: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ 
            data: [{ id: 'supervisor-1' }, { id: 'supervisor-2' }], 
            error: null 
          }))
        }))
      }))
    }))
  }
}));

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Meetings', () => {
    it('notifies only the partner when a meeting is created', async () => {
      const mentorId = 'mentor-123';
      const menteeId = 'mentee-456';
      const actorId = mentorId; // Mentor creates meeting
      
      await NotificationService.notifyMeetingChange(
        'meeting-1',
        'Initial Chat',
        new Date().toISOString(),
        mentorId,
        menteeId,
        actorId,
        true
      );

      // Should only call createNotification ONCE (for the mentee)
      expect(notificationsApi.createNotification).toHaveBeenCalledTimes(1);
      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        menteeId,
        'meeting_created',
        'New Meeting Scheduled',
        expect.stringContaining('Meeting: Initial Chat'),
        expect.stringContaining('id=meeting-1'),
        'meeting-1'
      );
    });

    it('notifies the partner when a meeting is rescheduled', async () => {
      const mentorId = 'mentor-123';
      const menteeId = 'mentee-456';
      const actorId = mentorId;
      
      await NotificationService.notifyMeetingChange(
        'meeting-1',
        'Initial Chat',
        new Date().toISOString(),
        mentorId,
        menteeId,
        actorId,
        false // isNew = false (Update)
      );

      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        menteeId,
        'meeting_updated',
        'Meeting Details Updated',
        expect.stringContaining('Meeting: Initial Chat'),
        expect.stringContaining('id=meeting-1'),
        'meeting-1'
      );
    });

    it('notifies the partner when a meeting is cancelled', async () => {
      const mentorId = 'mentor-123';
      const menteeId = 'mentee-456';
      const actorId = menteeId; // Mentee cancels
      
      await NotificationService.notifyMeetingCancelled(
        'Initial Chat',
        new Date().toISOString(),
        mentorId,
        menteeId,
        actorId
      );

      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        mentorId,
        'meeting_updated',
        'Meeting Cancelled',
        expect.stringContaining('Meeting cancelled: Initial Chat'),
        '/program-member/meetings'
      );
    });
  });

  describe('Task Management', () => {
    it('notifies all supervisors when a task is re-opened', async () => {
      const actorId = 'mentor-1';
      
      await NotificationService.notifyTaskReopened(
        'Site Visit',
        'pair-1',
        'John Mentor',
        'Sarah Mentee',
        actorId,
        'John Mentor'
      );

      // Should mock 2 supervisors. Total calls = 2
      expect(notificationsApi.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'supervisor-1',
        'note_added',
        'Task Re-opened',
        expect.stringContaining('John Mentor has re-opened "Site Visit"'),
        expect.stringContaining('pair=pair-1'),
        'pair-1'
      );
    });
  });

  describe('Task Submissions', () => {
    it('notifies all supervisors AND the partner with distinct messages', async () => {
      const mentorId = 'mentor-1';
      const menteeId = 'mentee-1';
      const actorId = menteeId; // Mentee submits task
      
      await NotificationService.notifyTaskSubmitted(
        'Site Visit',
        'pair-1',
        mentorId,
        menteeId,
        'John Mentor',
        'Sarah Mentee',
        actorId,
        'Sarah Mentee'
      );

      // Should call getSupervisors (which mocks 2 supervisors)
      // Total calls = 2 (supervisors) + 1 (partner) = 3
      expect(notificationsApi.createNotification).toHaveBeenCalledTimes(3);

      // Check Supervisor Notification
      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        'supervisor-1',
        'task_submitted',
        'Task Awaiting Review',
        expect.stringContaining('Sarah Mentee submitted "Site Visit" for your review'),
        expect.stringContaining('/supervisor/evidence-review'),
        'pair-1'
      );

      // Check Partner Notification (Mentor)
      expect(notificationsApi.createNotification).toHaveBeenCalledWith(
        mentorId,
        'task_submitted',
        'Task Submitted for Review',
        expect.stringContaining('Sarah Mentee has submitted Site Visit for Supervisor review'),
        expect.stringContaining('/program-member/tasks'),
        'pair-1'
      );
    });
  });
});
