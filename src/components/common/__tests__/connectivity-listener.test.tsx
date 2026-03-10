import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConnectivityListener } from '../connectivity-listener';
import { toast } from 'sonner';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => ({
      subscribe: vi.fn((cb) => {
        // Expose the callback so we can trigger status changes manually in tests
        (window as any).triggerSupabaseStatus = cb;
        return { unsubscribe: vi.fn() };
      }),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('ConnectivityListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset navigator.onLine mock if needed, but defaults to true usually
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
  });

  it('does not show restored message on initial successful connection', async () => {
    render(<ConnectivityListener />);
    
    // Trigger initial successful connection
    if ((window as any).triggerSupabaseStatus) {
      (window as any).triggerSupabaseStatus('SUBSCRIBED');
    }

    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows connection lost message when database disconnects after being connected', async () => {
    render(<ConnectivityListener />);
    
    // 1. Initial success
    (window as any).triggerSupabaseStatus('SUBSCRIBED');
    
    // 2. Lost connection
    (window as any).triggerSupabaseStatus('CLOSED');

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Connection to database lost'),
      expect.any(Object)
    );
  });

  it('shows restored message when database reconnects after being lost', async () => {
    render(<ConnectivityListener />);
    
    // 1. Initial success
    (window as any).triggerSupabaseStatus('SUBSCRIBED');
    
    // 2. Lost connection
    (window as any).triggerSupabaseStatus('CLOSED');
    
    // 3. Restored
    (window as any).triggerSupabaseStatus('SUBSCRIBED');

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('Database connection restored'),
      expect.any(Object)
    );
  });

  it('handles offline/online browser events', async () => {
    render(<ConnectivityListener />);
    
    // Mock connected once so we get restored toast later
    (window as any).triggerSupabaseStatus('SUBSCRIBED');

    // Simulate offline
    window.dispatchEvent(new Event('offline'));
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('You are offline'),
      expect.any(Object)
    );

    // Simulate online
    window.dispatchEvent(new Event('online'));
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('Internet connection restored'),
      expect.any(Object)
    );
  });
});
