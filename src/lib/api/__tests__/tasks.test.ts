import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updatePairTaskStatus } from '../tasks';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => {
  const mock = {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve({ data: { id: 't1' }, error: null })),
    then: vi.fn().mockImplementation((cb) => Promise.resolve(cb({ data: {}, error: null }))),
  };
  return { supabase: mock };
});

describe('updatePairTaskStatus API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets submitted_at when status is awaiting_review', async () => {
    await updatePairTaskStatus('t1', 'awaiting_review');

    expect(supabase.from).toHaveBeenCalledWith('mp_pair_tasks');
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'awaiting_review',
        submitted_at: expect.any(String)
      })
    );
  });

  it('sets completed_at when status is completed', async () => {
    await updatePairTaskStatus('t1', 'completed', 'u1');

    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        completed_at: expect.any(String),
        completed_by_user_id: 'u1'
      })
    );
  });
});
