import { supabase } from '@/lib/supabase';
import { createNotification } from './notifications';

/**
 * NotificationService
 * 
 * Centralised logic for application-side notifications.
 * This replaces database triggers with testable TypeScript code.
 * 
 * CORE RULE: No user should ever receive a notification for an action they performed.
 */
export const NotificationService = {
  
  /**
   * Helper to fetch all supervisors
   */
  async getSupervisors() {
    const { data, error } = await supabase
      .from('mp_profiles')
      .select('id')
      .eq('role', 'supervisor')
      .eq('status', 'active');
    
    if (error) {
      console.error('Error fetching supervisors for notification:', error);
      return [];
    }
    return data || [];
  },

  /**
   * Notify when a task is submitted for review
   * Notifies ALL supervisors (excluding actor) AND the pair buddy
   */
  async notifyTaskSubmitted(
    taskName: string, 
    pairId: string, 
    mentorId: string, 
    menteeId: string,
    mentorName: string, 
    menteeName: string,
    actorId: string,
    actorName: string
  ) {
    const supervisors = await this.getSupervisors();
    
    // 1. Notify Supervisors (Action Required)
    const supervisorPromises = supervisors
      .filter(s => s.id !== actorId)
      .map(s => 
        createNotification(
          s.id,
          'task_submitted',
          'Task Awaiting Review',
          `${actorName} submitted "${taskName}" for your review (Pair: ${mentorName} & ${menteeName}).`,
          `/supervisor/evidence-review?pairId=${pairId}`,
          pairId
        )
      );

    // 2. Notify the Pair Buddy (Informational)
    const buddyId = actorId === mentorId ? menteeId : mentorId;
    
    let buddyPromise = Promise.resolve(null);
    if (buddyId !== actorId) {
      buddyPromise = createNotification(
        buddyId,
        'task_submitted',
        'Task Submitted for Review',
        `${actorName} has submitted ${taskName} for Supervisor review.`,
        `/program-member/tasks?taskId=${pairId}`,
        pairId
      );
    }
    
    await Promise.all([...supervisorPromises, buddyPromise]);
  },

  /**
   * Notify pair members when evidence is reviewed
   */
  async notifyTaskReviewed(
    taskId: string, 
    taskName: string, 
    status: 'approved' | 'rejected', 
    feedback: string | null,
    submitterId: string,
    partnerId: string,
    mentorName: string,
    menteeName: string,
    isMentorSubmitter: boolean,
    actorId: string // The Supervisor reviewing it
  ) {
    const statusLabel = status === 'approved' ? 'Approved' : 'Revision Requested';
    const type = status === 'approved' ? 'evidence_approved' : 'evidence_rejected';
    
    // 1. Notify Submitter (if not the one who reviewed it, which is always true here)
    const submitterPromise = submitterId !== actorId 
      ? createNotification(
          submitterId,
          type,
          `Evidence ${statusLabel}`,
          status === 'approved' 
            ? `Your evidence for ${taskName} has been approved by the Supervisor.`
            : `Revision requested on ${taskName}. Feedback: ${feedback || 'Check details.'}`,
          `/program-member/tasks?taskId=${taskId}`,
          taskId
        )
      : Promise.resolve(null);

    // 2. Notify Partner
    const partnerName = isMentorSubmitter ? mentorName : menteeName;
    const partnerPromise = partnerId !== actorId
      ? createNotification(
          partnerId,
          type,
          `Pair Progress: Evidence ${statusLabel}`,
          status === 'approved'
            ? `The Supervisor approved the evidence uploaded by ${partnerName}.`
            : `Revision requested on evidence by ${partnerName}. Feedback: ${feedback || 'Check details.'}`,
          `/program-member/tasks?taskId=${taskId}`,
          taskId
        )
      : Promise.resolve(null);

    await Promise.all([submitterPromise, partnerPromise]);
  },

  /**
   * Notify when a meeting is created or updated
   */
  async notifyMeetingChange(
    meetingId: string,
    title: string,
    dateTime: string,
    mentorId: string,
    menteeId: string,
    actorId: string,
    isNew: boolean
  ) {
    const type = isNew ? 'meeting_created' : 'meeting_updated';
    const titleLabel = isNew ? 'New Meeting Scheduled' : 'Meeting Details Updated';
    const formattedDate = new Date(dateTime).toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const description = `Meeting: ${title} on ${formattedDate}`;
    const actionUrl = `/program-member/meetings?id=${meetingId}`;

    // STRICT FILTER: No self-notification
    const recipients = [mentorId, menteeId].filter(id => id !== actorId);

    const promises = recipients.map(id => 
      createNotification(id, type, titleLabel, description, actionUrl, meetingId)
    );

    await Promise.all(promises);
  },

  /**
   * Notify when a meeting is cancelled (deleted)
   */
  async notifyMeetingCancelled(
    title: string,
    dateTime: string,
    mentorId: string,
    menteeId: string,
    actorId: string
  ) {
    const formattedDate = new Date(dateTime).toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const description = `Meeting cancelled: ${title} which was scheduled for ${formattedDate}`;
    
    // STRICT FILTER: No self-notification
    const recipients = [mentorId, menteeId].filter(id => id !== actorId);

    const promises = recipients.map(id => 
      createNotification(id, 'meeting_updated', 'Meeting Cancelled', description, '/program-member/meetings')
    );

    await Promise.all(promises);
  },

  /**
   * Notify when a task is re-opened by a pair member
   * Notifies ALL supervisors
   */
  async notifyTaskReopened(
    taskName: string, 
    pairId: string, 
    mentorName: string, 
    menteeName: string,
    actorId: string,
    actorName: string
  ) {
    const supervisors = await this.getSupervisors();
    
    const promises = supervisors
      .filter(s => s.id !== actorId)
      .map(s => 
        createNotification(
          s.id,
          'note_added',
          'Task Re-opened',
          `${actorName} has re-opened "${taskName}" for the pair ${mentorName} & ${menteeName}.`,
          `/supervisor/checklist?pair=${pairId}`,
          pairId
        )
      );
    
    await Promise.all(promises);
  },

  /**
   * Notify when a supervisor adds a task to an existing pair
   */
  async notifyTaskAdded(taskId: string, taskName: string, mentorId: string, menteeId: string, actorId: string) {
    const title = 'New Task Assigned';
    const mentorDesc = `The Supervisor has added a new task to your pairing: ${taskName}`;
    const menteeDesc = `A new task has been added to your checklist: ${taskName}`;
    const actionUrl = `/program-member/tasks?taskId=${taskId}`;

    const recipients = [];
    if (mentorId !== actorId) recipients.push(createNotification(mentorId, 'task_completed', title, mentorDesc, actionUrl, taskId));
    if (menteeId !== actorId) recipients.push(createNotification(menteeId, 'task_completed', title, menteeDesc, actionUrl, taskId));

    await Promise.all(recipients);
  },

  /**
   * Notify partner when an individual evidence file is uploaded (Pulse)
   */
  async notifyEvidencePulse(evidenceId: string, taskName: string, submitterName: string, recipientId: string, actorId: string) {
    // STRICT FILTER: No self-notification
    if (recipientId === actorId) return;

    await createNotification(
      recipientId,
      'evidence_uploaded',
      'Partner Shared Evidence',
      `${submitterName} shared evidence for: ${taskName}`,
      `/program-member/tasks?id=${evidenceId}`,
      evidenceId
    );
  },

  /**
   * Notify supervisor of pair milestones
   */
  async notifyMilestone(
    type: 'milestone_50' | 'pair_completed', 
    pairId: string, 
    mentorName: string, 
    menteeName: string, 
    actorId: string,
    actorName: string
  ) {
    const supervisors = await this.getSupervisors();
    
    const title = type === 'pair_completed' ? 'Program Checklist Completed' : '50% Milestone Reached';
    const description = type === 'pair_completed'
      ? `${actorName} completed the final task for the pair ${mentorName} & ${menteeName}.`
      : `${actorName} reached the 50% milestone for the pair ${mentorName} & ${menteeName}.`;

    // STRICT FILTER: No self-notification for supervisors
    const promises = supervisors
      .filter(s => s.id !== actorId)
      .map(s => 
        createNotification(s.id, type, title, description, `/supervisor/pairs?pairId=${pairId}`, pairId)
      );

    await Promise.all(promises);
  },

  /**
   * Notify supervisor when a profile is completed
   */
  async notifyProfileCompleted(profileId: string, fullName: string, actorId: string) {
    const supervisors = await this.getSupervisors();
    
    // STRICT FILTER: No self-notification
    const promises = supervisors
      .filter(s => s.id !== actorId)
      .map(s => 
        createNotification(
          s.id,
          'profile_completed',
          'New Participant Onboarded',
          `${fullName} has completed their initial profile setup.`,
          `/supervisor/participants?id=${profileId}`,
          profileId
        )
      );

    await Promise.all(promises);
  }
};
