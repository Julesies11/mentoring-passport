import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMeeting, updateMeeting } from '../meetings';
import { supabase } from '@/lib/supabase';
import { LOCATION_TYPE } from '@/config/constants';

// Shared mocks
const mockInsert = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn().mockImplementation(() => Promise.resolve({ 
    data: { 
        id: 'm1',
        title: 'Test Meeting',
        mp_pairs: { id: 'p1', mentor: { full_name: 'Mentor' }, mentee: { full_name: 'Mentee' } }
    }, 
    error: null 
}));

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn().mockReturnThis(),
      insert: (...args: any[]) => mockInsert(...args),
      update: (...args: any[]) => mockUpdate(...args),
      select: (...args: any[]) => mockSelect(...args),
      eq: (...args: any[]) => mockEq(...args),
      single: (...args: any[]) => mockSingle(...args),
    }
  };
});

describe('Meetings API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockClear();
    mockUpdate.mockClear();
  });

  it('includes duration_minutes and location_details when creating a meeting', async () => {
    // 1. Mock first call (fetch pair)
    mockSingle.mockResolvedValueOnce({ data: { program_id: 'prog1' }, error: null });
    // 2. Mock second call (insert meeting)
    mockSingle.mockResolvedValueOnce({ 
        data: { 
            id: 'm1',
            mp_pairs: { id: 'p1' }
        }, 
        error: null 
    });

    await createMeeting({
      pair_id: 'p1',
      title: 'Sync',
      date_time: '2024-03-20T10:00:00Z',
      duration_minutes: 45,
      location_details: 'https://zoom.us/j/123',
      location_type: LOCATION_TYPE.VIRTUAL
    });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        duration_minutes: 45,
        location_details: 'https://zoom.us/j/123'
      })
    );
  });

  it('includes duration_minutes and location_details when updating a meeting', async () => {
    await updateMeeting('m1', {
      duration_minutes: 90,
      location_details: 'Room 101'
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        duration_minutes: 90,
        location_details: 'Room 101'
      })
    );
  });
});
