import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  fetchNotifications, 
  fetchUnreadCount, 
  markAsRead, 
  createNotification 
} from '../notifications';
import { supabase } from '@/lib/supabase';

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
    then: vi.fn((resolve) => resolve(finalValue)),
  };
  return mock;
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null }),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

describe('Notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchNotifications calls correct supabase methods', async () => {
    const mockChain = createChainableMock({ data: [], error: null });
    vi.mocked(supabase.from).mockReturnValue(mockChain);
    
    await fetchNotifications(10);
    
    expect(supabase.from).toHaveBeenCalledWith('mp_notifications');
    expect(mockChain.limit).toHaveBeenCalledWith(10);
    expect(mockChain.eq).toHaveBeenCalledWith('recipient_id', 'u1');
  });

  it('fetchUnreadCount returns exact count', async () => {
    const mockChain = createChainableMock({ count: 5, error: null });
    vi.mocked(supabase.from).mockReturnValue(mockChain);
    
    const count = await fetchUnreadCount();
    
    expect(count).toBe(5);
    expect(mockChain.eq).toHaveBeenCalledWith('is_read', false);
  });

  it('markAsRead updates specific notification', async () => {
    const mockChain = createChainableMock({ error: null });
    vi.mocked(supabase.from).mockReturnValue(mockChain);
    
    await markAsRead('n1');
    
    expect(mockChain.update).toHaveBeenCalledWith({ is_read: true });
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'n1');
  });

  it('createNotification inserts new record', async () => {
    const mockChain = createChainableMock({ error: null });
    vi.mocked(supabase.from).mockReturnValue(mockChain);
    
    await createNotification('u1', 'type', 'Title', 'Desc', '/url', 'r1');
    
    expect(mockChain.insert).toHaveBeenCalledWith({
      recipient_id: 'u1',
      type: 'type',
      title: 'Title',
      description: 'Desc',
      action_url: '/url',
      related_id: 'r1',
      is_read: false,
    });
  });
});
