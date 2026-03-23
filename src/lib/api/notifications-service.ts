import { SupabaseClient } from '@supabase/supabase-js';
import { supabase as defaultSupabase } from '@/lib/supabase';
import { createNotification as defaultCreateNotification } from './notifications';
import { logError } from '@/lib/logger';

/**
 * NotificationService
 * 
 * Centralised logic for application-side notifications.
 * 
 * CORE RULES:
 * 1. High Signal: Only notify on actionable or major events.
 * 2. No Spam: Filter out the actor (self-notification).
 * 3. Scoped: Only notify relevant supervisors for a specific program.
 * 4. Testable: Supports dependency injection.
 */
export class NotificationServiceClass {
  private supabase: SupabaseClient;
  private createNotification: typeof defaultCreateNotification;

  constructor(
    supabaseClient: SupabaseClient = defaultSupabase,
    createFunc: typeof defaultCreateNotification = defaultCreateNotification
  ) {
    this.supabase = supabaseClient;
    this.createNotification = createFunc;
  }

  /**
   * Helper to fetch supervisors assigned to a specific program
   * If no programId is provided, fetches all active supervisors.
   */
  async getProgramSupervisors(programId?: string) {
    try {
      if (!programId) {
        const { data, error } = await this.supabase
          .from('mp_profiles')
          .select('id')
          .eq('role', 'supervisor')
          .eq('status', 'active');
        
        if (error) throw error;
        return data || [];
      }

      const { data, error } = await this.supabase
        .from('mp_supervisor_programs')
        .select('user_id')
        .eq('program_id', programId);
      
      if (error) throw error;
      return (data || []).map(d => ({ id: d.user_id }));
    } catch (error: any) {
      await logError({
        message: programId ? `Error fetching supervisors for program ${programId}` : 'Error fetching all supervisors',
        componentName: 'notifications-api',
        metadata: { error, programId }
      });
      return [];
    }
  }

  /**
   * Helper to fetch all active Org Admins
   */
  async getOrgAdmins() {
    try {
      const { data, error } = await this.supabase
        .from('mp_profiles')
        .select('id')
        .eq('role', 'org-admin')
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      await logError({
        message: 'Error fetching org admins',
        componentName: 'notifications-api',
        metadata: { error }
      });
      return [];
    }
  }

  /**
   * Notify when a user's role is escalated (Security Oversight)
   */
  async notifyRoleUpdated(params: {
    userId: string;
    userName: string;
    newRole: string;
    actorId: string;
    actorName: string;
  }) {
    try {
      const { userId, userName, newRole, actorId, actorName } = params;
      const admins = await this.getOrgAdmins();

      const promises = admins
        .filter(a => a.id !== actorId)
        .map(a => 
          this.createNotification(
            a.id,
            'system_error', // High priority security type
            'Security: Role Updated',
            `${userName} has been granted the "${newRole}" role by ${actorName}.`,
            `/supervisor/participants?id=${userId}`,
            userId
          )
        );

      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyRoleUpdated',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify Admins when a new supervisor is ready for assignment
   */
  async notifySupervisorOnboarded(params: {
    supervisorId: string;
    supervisorName: string;
    actorId: string;
  }) {
    try {
      const { supervisorId, supervisorName, actorId } = params;
      const admins = await this.getOrgAdmins();

      const promises = admins
        .filter(a => a.id !== actorId)
        .map(a => 
          this.createNotification(
            a.id,
            'profile_completed',
            'New Supervisor Ready',
            `${supervisorName} has completed their profile and is ready to be assigned to programs.`,
            `/supervisor/org-settings`, // Direct to supervisor management/assignment
            supervisorId
          )
        );

      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifySupervisorOnboarded',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify Admins when a program is nearing its end date
   */
  async notifyProgramEndingSoon(params: {
    programId: string;
    programName: string;
    endDate: string;
  }) {
    try {
      const { programId, programName, endDate } = params;
      const admins = await this.getOrgAdmins();
      
      const formattedDate = new Date(endDate).toLocaleDateString('en-GB', { 
        day: '2-digit', month: 'short', year: 'numeric' 
      });

      const promises = admins.map(a => 
        this.createNotification(
          a.id,
          'stagnation_alert',
          'Program Ending Soon',
          `Reminder: "${programName}" is scheduled to conclude on ${formattedDate}. Please review final submissions.`,
          `/supervisor/org-settings?program=${programId}`,
          programId
        )
      );

      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyProgramEndingSoon',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify Admins when an entire program is successfully completed
   */
  async notifyProgramCompleted(params: {
    programId: string;
    programName: string;
  }) {
    try {
      const { programId, programName } = params;
      const admins = await this.getOrgAdmins();

      const promises = admins.map(a => 
        this.createNotification(
          a.id,
          'pair_completed',
          'Program Successfully Completed!',
          `Success! All pairs in "${programName}" have finished their mentoring journeys.`,
          `/supervisor/dashboard?program=${programId}`,
          programId
        )
      );

      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyProgramCompleted',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify when a task is submitted for review
   * High Priority: Action required for Supervisors + Informational for Buddy.
   */
  async notifyTaskSubmitted(params: {
    taskId: string;
    taskName: string;
    pairId: string;
    programId: string;
    mentorId: string;
    menteeId: string;
    mentorName: string;
    menteeName: string;
    actorId: string;
    actorName: string;
  }) {
    try {
      const { taskId, taskName, pairId, programId, mentorId, menteeId, mentorName, menteeName, actorId, actorName } = params;
      
      // 1. Notify Scoped Supervisors (Action Required)
      const supervisors = await this.getProgramSupervisors(programId);
      const supervisorPromises = supervisors
        .filter(s => s.id !== actorId)
        .map(s => 
          this.createNotification(
            s.id,
            'task_submitted',
            `Review Required: ${taskName}`,
            `${actorName} submitted evidence for "${taskName}" (Pair: ${mentorName} & ${menteeName}).`,
            `/supervisor/evidence-review?program=${programId}&pairId=${pairId}`,
            pairId
          )
        );

      // 2. Notify the Partner (Buddy) (Informational)
      const buddyId = actorId === mentorId ? menteeId : mentorId;
      let buddyPromise = Promise.resolve();
      
      if (buddyId && buddyId !== actorId) {
        buddyPromise = this.createNotification(
          buddyId,
          'task_submitted',
          `Task Submitted by ${actorName}`,
          `${actorName} submitted "${taskName}" for supervisor review.`,
          `/program-member/tasks?pair=${pairId}&taskId=${taskId}`,
          pairId
        );
      }
      
      await Promise.all([...supervisorPromises, buddyPromise]);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyTaskSubmitted',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify partner when a task is marked as completed (Self-completion)
   */
  async notifyTaskCompleted(params: {
    taskId: string;
    taskName: string;
    pairId: string;
    mentorId: string;
    menteeId: string;
    actorId: string;
    actorName: string;
  }) {
    try {
      const { taskId, taskName, pairId, mentorId, menteeId, actorId, actorName } = params;
      const buddyId = actorId === mentorId ? menteeId : mentorId;
      
      if (buddyId && buddyId !== actorId) {
        await this.createNotification(
          buddyId,
          'task_completed',
          `Task Completed by ${actorName}`,
          `${actorName} marked "${taskName}" as completed. Great progress!`,
          `/program-member/tasks?pair=${pairId}&taskId=${taskId}`,
          taskId
        );
      }
    } catch (error: any) {
      await logError({
        message: 'Error in notifyTaskCompleted',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify partner when a task is re-opened by their peer
   */
  async notifyTaskReopenedByPeer(params: {
    taskId: string;
    taskName: string;
    pairId: string;
    mentorId: string;
    menteeId: string;
    actorId: string;
    actorName: string;
  }) {
    try {
      const { taskId, taskName, pairId, mentorId, menteeId, actorId, actorName } = params;
      const buddyId = actorId === mentorId ? menteeId : mentorId;
      
      if (buddyId && buddyId !== actorId) {
        await this.createNotification(
          buddyId,
          'note_added',
          `Task Re-opened by ${actorName}`,
          `${actorName} has re-opened "${taskName}" to make changes.`,
          `/program-member/tasks?pair=${pairId}&taskId=${taskId}`,
          taskId
        );
      }
    } catch (error: any) {
      await logError({
        message: 'Error in notifyTaskReopenedByPeer',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify partner when a note is added to a task
   */
  async notifyTaskNoteAdded(params: {
    taskId: string;
    taskName: string;
    pairId: string;
    mentorId: string;
    menteeId: string;
    actorId: string;
    actorName: string;
    noteSnippet: string;
  }) {
    try {
      const { taskId, taskName, pairId, mentorId, menteeId, actorId, actorName, noteSnippet } = params;
      const buddyId = actorId === mentorId ? menteeId : mentorId;
      
      if (buddyId && buddyId !== actorId) {
        await this.createNotification(
          buddyId,
          'note_added',
          `New Note from ${actorName}`,
          `${actorName} added a note to "${taskName}": "${noteSnippet.substring(0, 50)}..."`,
          `/program-member/tasks?pair=${pairId}&taskId=${taskId}`,
          taskId
        );
      }
    } catch (error: any) {
      await logError({
        message: 'Error in notifyTaskNoteAdded',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify pair members when evidence is reviewed (Approved/Rejected)
   * High Priority: Critical feedback loop.
   */
  async notifyTaskReviewed(params: {
    taskId: string;
    taskName: string;
    pairId: string;
    status: 'approved' | 'rejected';
    feedback: string | null;
    submitterId: string;
    partnerId: string;
    partnerName: string;
    actorId: string; // The Supervisor
  }) {
    try {
      const { taskId, taskName, pairId, status, feedback, submitterId, partnerId, partnerName, actorId } = params;
      const statusLabel = status === 'approved' ? 'Approved' : 'Revision Requested';
      const type = status === 'approved' ? 'evidence_approved' : 'evidence_rejected';
      
      // 1. Notify Submitter
      const submitterPromise = submitterId !== actorId 
        ? this.createNotification(
            submitterId,
            type,
            `Task ${statusLabel}`,
            status === 'approved' 
              ? `Your submission for "${taskName}" was approved.`
              : `Revision requested on "${taskName}". Feedback: ${feedback || 'Please check the task details.'}`,
            `/program-member/tasks?pair=${pairId}&taskId=${taskId}`,
            taskId
          )
        : Promise.resolve();

      // 2. Notify Partner
      const partnerPromise = partnerId !== actorId
        ? this.createNotification(
            partnerId,
            type,
            `Pair Progress: ${statusLabel}`,
            status === 'approved'
              ? `The supervisor approved the submission for "${taskName}" (uploaded by ${partnerName}).`
              : `Revision requested on "${taskName}" (uploaded by ${partnerName}). Feedback: ${feedback || 'Please check the task details.'}`,
            `/program-member/tasks?pair=${pairId}&taskId=${taskId}`,
            taskId
          )
        : Promise.resolve();

      await Promise.all([submitterPromise, partnerPromise]);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyTaskReviewed',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify when a new meeting is scheduled
   */
  async notifyMeetingCreated(params: {
    meetingId: string;
    title: string;
    dateTime: string;
    mentorId: string;
    menteeId: string;
    mentorName: string;
    menteeName: string;
    actorId: string;
  }) {
    try {
      const { meetingId, title, dateTime, mentorId, menteeId, mentorName, menteeName, actorId } = params;
      
      const formattedDate = new Date(dateTime).toLocaleString('en-GB', { 
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
      });

      const description = `New meeting scheduled: "${title}" on ${formattedDate}`;
      const actionUrl = `/program-member/meetings?id=${meetingId}`;

      const recipients = [
        { id: mentorId, partnerName: menteeName },
        { id: menteeId, partnerName: mentorName }
      ].filter(r => r.id && r.id !== actorId);

      const promises = recipients.map(r => 
        this.createNotification(
          r.id!, 
          'meeting_created', 
          `New Meeting with ${r.partnerName}`, 
          description, 
          actionUrl, 
          meetingId
        )
      );

      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyMeetingCreated',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify when meeting details are updated
   */
  async notifyMeetingUpdated(params: {
    meetingId: string;
    title: string;
    dateTime: string;
    mentorId: string;
    menteeId: string;
    mentorName: string;
    menteeName: string;
    actorId: string;
  }) {
    try {
      const { meetingId, title, dateTime, mentorId, menteeId, mentorName, menteeName, actorId } = params;
      
      const formattedDate = new Date(dateTime).toLocaleString('en-GB', { 
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
      });

      const description = `Meeting details updated: "${title}" on ${formattedDate}`;
      const actionUrl = `/program-member/meetings?id=${meetingId}`;

      const recipients = [
        { id: mentorId, partnerName: menteeName },
        { id: menteeId, partnerName: mentorName }
      ].filter(r => r.id && r.id !== actorId);

      const promises = recipients.map(r => 
        this.createNotification(
          r.id!, 
          'meeting_updated', 
          `Meeting with ${r.partnerName} Updated`, 
          description, 
          actionUrl, 
          meetingId
        )
      );

      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyMeetingUpdated',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify when a task is re-opened (Manual Override)
   */
  async notifyTaskReopened(params: {
    taskName: string; 
    pairId: string; 
    programId: string;
    mentorName: string; 
    menteeName: string;
    actorId: string;
    actorName: string;
  }) {
    try {
      const { taskName, pairId, programId, mentorName, menteeName, actorId, actorName } = params;
      const supervisors = await this.getProgramSupervisors(programId);
      
      const promises = supervisors
        .filter(s => s.id !== actorId)
        .map(s => 
          this.createNotification(
            s.id,
            'note_added',
            `Task Re-opened: ${taskName}`,
            `${actorName} re-opened "${taskName}". Any pending review for this item has been cancelled.`,
            `/supervisor/checklist?program=${programId}&pair=${pairId}`,
            pairId
          )
        );
      
      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyTaskReopened',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify Supervisors when a participant completes their profile and is ready for matching
   */
  async notifyParticipantProfileReady(params: {
    profileId: string; 
    fullName: string; 
    actorId: string;
  }) {
    try {
      const { profileId, fullName, actorId } = params;
      // For now, notify all supervisors as participant readiness is organization-wide until assigned
      const supervisors = await this.getProgramSupervisors(); 
      
      const promises = supervisors
        .filter(s => s.id !== actorId)
        .map(s => 
          this.createNotification(
            s.id,
            'profile_completed',
            'New Participant Onboarded',
            `${fullName} has completed their profile and is ready for program assignment.`,
            `/supervisor/participants?id=${profileId}`,
            profileId
          )
        );

      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyParticipantProfileReady',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify scoped Supervisors when a new relationship is matched
   */
  async notifyPairCreated(params: {
    pairId: string;
    programId: string;
    programName: string;
    mentorName: string;
    menteeName: string;
    actorId: string;
  }) {
    try {
      const { pairId, programId, programName, mentorName, menteeName, actorId } = params;
      const supervisors = await this.getProgramSupervisors(programId);

      const promises = supervisors
        .filter(s => s.id !== actorId)
        .map(s => 
          this.createNotification(
            s.id,
            'pair_created',
            'New Pair Matched',
            `A new relationship has been formed between ${mentorName} and ${menteeName} in ${programName}.`,
            `/supervisor/pairs?program=${programId}&pairId=${pairId}`,
            pairId
          )
        );

      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyPairCreated',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify supervisor of pair milestones (50% and 100%)
   */
  async notifyMilestone(params: {
    type: 'milestone_50' | 'pair_completed';
    pairId: string;
    programId: string;
    mentorName: string;
    menteeName: string;
    actorId: string;
    actorName: string;
  }) {
    try {
      const { type, pairId, programId, mentorName, menteeName, actorId, actorName } = params;
      const supervisors = await this.getProgramSupervisors(programId);
      
      const title = type === 'pair_completed' ? 'Pair Completed Journey!' : '50% Milestone Reached';
      const description = type === 'pair_completed'
        ? `Congratulations! ${mentorName} and ${menteeName} have completed 100% of their program tasks.`
        : `The pair ${mentorName} & ${menteeName} are halfway through their program.`;

      const promises = supervisors
        .filter(s => s.id !== actorId)
        .map(s => 
          this.createNotification(s.id, type, title, description, `/supervisor/pairs?program=${programId}&pairId=${pairId}`, pairId)
        );

      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyMilestone',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify when a pair is first matched (Informational for members)
   */
  async notifyRelationshipMatched(params: {
    mentorId: string;
    menteeId: string;
    mentorName: string;
    menteeName: string;
    programName: string;
    programId: string;
    actorId: string;
  }) {
    try {
      const { mentorId, menteeId, mentorName, menteeName, programName, programId, actorId } = params;
      
      const title = 'Relationship Matched';
      const actionUrl = '/program-member/dashboard';

      const promises = [];
      if (mentorId && mentorId !== actorId) {
        promises.push(this.createNotification(
          mentorId, 
          'relationship_matched', 
          title, 
          `You have been matched with ${menteeName} in the ${programName} program.`, 
          actionUrl, 
          programId
        ));
      }
      if (menteeId && menteeId !== actorId) {
        promises.push(this.createNotification(
          menteeId, 
          'relationship_matched', 
          title, 
          `You have been matched with ${mentorName} in the ${programName} program.`, 
          actionUrl, 
          programId
        ));
      }

      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyRelationshipMatched',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify system admins of critical errors
   */
  async notifyCriticalError(errorId: string, message: string) {
    try {
      const { data: admins, error } = await this.supabase
        .from('mp_profiles')
        .select('id')
        .eq('role', 'administrator');

      if (error) throw error;
      if (!admins) return;

      const promises = admins.map(admin => 
        this.createNotification(
          admin.id,
          'system_error',
          'Critical System Error',
          `Error Logged: ${message.substring(0, 100)}...`,
          `/supervisor/error-logs?id=${errorId}`,
          errorId
        )
      );

      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyCriticalError',
        componentName: 'notifications-api',
        metadata: { error, errorId, originalMessage: message }
      });
      // Don't rethrow to avoid infinite loops if error logging itself fails
    }
  }

  /**
   * Notify when a meeting is cancelled (deleted)
   */
  async notifyMeetingCancelled(params: {
    title: string;
    dateTime: string;
    mentorId: string;
    menteeId: string;
    actorId: string;
  }) {
    try {
      const { title, dateTime, mentorId, menteeId, actorId } = params;
      const formattedDate = new Date(dateTime).toLocaleString('en-GB', { 
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
      });

      const description = `Meeting cancelled: "${title}" which was scheduled for ${formattedDate}`;
      
      const recipients = [mentorId, menteeId].filter(id => id && id !== actorId);

      const promises = recipients.map(id => 
        this.createNotification(id!, 'meeting_updated', 'Meeting Cancelled', description, '/program-member/meetings', null)
      );

      await Promise.all(promises);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyMeetingCancelled',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify when a supervisor adds a task to an existing pair
   */
  async notifyTaskAdded(params: {
    taskId: string; 
    taskName: string; 
    mentorId: string; 
    menteeId: string; 
    actorId: string;
  }) {
    try {
      const { taskId, taskName, mentorId, menteeId, actorId } = params;
      const title = 'New Task Assigned';
      const mentorDesc = `The Supervisor has added a new task to your pairing: ${taskName}`;
      const menteeDesc = `A new task has been added to your checklist: ${taskName}`;
      const actionUrl = `/program-member/tasks?taskId=${taskId}`;

      const recipients = [];
      if (mentorId && mentorId !== actorId) recipients.push(this.createNotification(mentorId, 'task_completed', title, mentorDesc, actionUrl, taskId));
      if (menteeId && menteeId !== actorId) recipients.push(this.createNotification(menteeId, 'task_completed', title, menteeDesc, actionUrl, taskId));

      await Promise.all(recipients);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyTaskAdded',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }

  /**
   * Notify supervisor when a profile is completed (Legacy flow, replaced by notifyParticipantProfileReady)
   */
  async notifyProfileCompleted(params: {
    profileId: string; 
    fullName: string; 
    actorId: string;
  }) {
    try {
      return await this.notifyParticipantProfileReady(params);
    } catch (error: any) {
      await logError({
        message: 'Error in notifyProfileCompleted',
        componentName: 'notifications-api',
        metadata: { error, params }
      });
      throw error;
    }
  }
}

// Export default instance
export const NotificationService = new NotificationServiceClass();
