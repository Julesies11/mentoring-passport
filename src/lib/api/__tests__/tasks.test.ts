import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updatePairTaskStatus } from '../tasks';
import { supabase } from '@/lib/supabase';
import { TASK_STATUS } from '@/config/constants';

vi.mock('@/lib/supabase', () => {
  const mock = {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve({ 
        data: { 
            id: 't1',
            submitted_by: null,
            completed_by: null,
            last_reviewed_by: null
        }, 
        error: null 
    })),
  };
  return { supabase: mock };
});

describe('updatePairTaskStatus API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets submission metadata when status is awaiting_review', async () => {
    await updatePairTaskStatus('t1', TASK_STATUS.AWAITING_REVIEW, 'user-123');

    expect(supabase.from).toHaveBeenCalledWith('mp_pair_tasks');
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TASK_STATUS.AWAITING_REVIEW,
        submitted_at: expect.any(String),
        submitted_by_id: 'user-123',
        last_action: 'submitted'
      })
    );
  });

  it('sets completion and review metadata when status is completed', async () => {
    await updatePairTaskStatus('t1', TASK_STATUS.COMPLETED, 'supervisor-456');

    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TASK_STATUS.COMPLETED,
        completed_at: expect.any(String),
        completed_by_user_id: 'supervisor-456',
        last_reviewed_at: expect.any(String),
        last_reviewed_by_id: 'supervisor-456',
        last_action: 'approved'
      })
    );
  });

  it('sets review metadata when status is revision_required', async () => {
    await updatePairTaskStatus('t1', 'revision_required', 'supervisor-456', 'Please fix evidence');

    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'revision_required',
        last_reviewed_at: expect.any(String),
        last_reviewed_by_id: 'supervisor-456',
        last_action: 'rejected',
        evidence_notes: 'Please fix evidence'
      })
    );
  });

  it('clears metadata when moving back to not_submitted', async () => {
    await updatePairTaskStatus('t1', TASK_STATUS.NOT_STARTED);

    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: TASK_STATUS.NOT_STARTED,
        completed_at: null,
        completed_by_user_id: null,
        submitted_at: null,
        submitted_by_id: null,
        last_action: null
      })
    );
  });
});
