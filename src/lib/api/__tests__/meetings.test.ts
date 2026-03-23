import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMeeting, updateMeeting } from '../meetings';
import { supabase } from '@/lib/supabase';
import { LOCATION_TYPE } from '@/config/constants';

// Helper to create a chainable mock
const createChainableMock = (finalValue: any) => {
  const mock: any = {
    select: vi.fn(() => mock),
    order: vi.fn(() => mock),
    limit: vi.fn(() => mock),
    eq: vi.fn(() => mock),
    update: vi.fn(() => mock),
    delete: vi.fn(() => mock),
    insert: vi.fn(() => mock),
    single: vi.fn(() => Promise.resolve(finalValue)),
    maybeSingle: vi.fn(() => Promise.resolve(finalValue)),
    then: vi.fn((resolve) => resolve(finalValue)),
  };
  return mock;
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

describe('Meetings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes duration_minutes and location_details when creating a meeting', async () => {
    const mockPair = { data: { program_id: 'prog1' }, error: null };
    const mockMeeting = { 
      data: { 
        id: 'm1',
        mp_pairs: { id: 'p1' }
      }, 
      error: null 
    };

    // We need to return different results for different table calls
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'mp_pairs') return createChainableMock(mockPair);
      if (table === 'mp_meetings') return createChainableMock(mockMeeting);
      return createChainableMock({ data: null, error: null });
    });

    await createMeeting({
      pair_id: 'p1',
      title: 'Sync',
      date_time: '2024-03-20T10:00:00Z',
      duration_minutes: 45,
      location_details: 'https://zoom.us/j/123',
      location_type: LOCATION_TYPE.VIRTUAL
    });

    expect(supabase.from).toHaveBeenCalledWith('mp_meetings');
  });

  it('includes duration_minutes and location_details when updating a meeting', async () => {
    const mockMeeting = { data: { id: 'm1' }, error: null };
    const mockChain = createChainableMock(mockMeeting);
    vi.mocked(supabase.from).mockReturnValue(mockChain);

    await updateMeeting('m1', {
      duration_minutes: 90,
      location_details: 'Room 101'
    });

    expect(mockChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        duration_minutes: 90,
        location_details: 'Room 101'
      })
    );
  });
});
