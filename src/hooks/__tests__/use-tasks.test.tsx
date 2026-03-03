import { renderHook, waitFor } from '@testing-library/react';
import { usePairTasks } from '../use-tasks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/auth/context/auth-context';
import { describe, it, expect } from 'vitest';
import React from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <AuthContext.Provider value={{ profileId: 'u1' } as any}>
      {children}
    </AuthContext.Provider>
  </QueryClientProvider>
);

describe('usePairTasks', () => {
  it('fetches tasks for a specific pair', async () => {
    const { result } = renderHook(() => usePairTasks('p1'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].name).toBe('Initial Meeting');
  });

  it('provides a deleteTask function', async () => {
    const { result } = renderHook(() => usePairTasks('p1'), { wrapper });
    
    expect(typeof result.current.deleteTask).toBe('function');
  });
});
