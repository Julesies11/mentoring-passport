import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useParticipants } from '../use-participants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as participantsApi from '@/lib/api/participants';

// Mock the API layer
vi.mock('@/lib/api/participants', () => ({
  fetchParticipants: vi.fn(),
  fetchParticipantsByRole: vi.fn(),
  fetchParticipant: vi.fn(),
  fetchOrgSupervisors: vi.fn(),
  assignSupervisorToProgram: vi.fn(),
  removeSupervisorFromProgram: vi.fn(),
  createParticipant: vi.fn(),
  updateParticipant: vi.fn(),
  archiveParticipant: vi.fn(),
  restoreParticipant: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useParticipants Single-Organisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches participants correctly without organisation filters', async () => {
    const mockParticipants = [{ id: 'u1', full_name: 'Test', job_title_name: 'No Job Title' }];
    vi.mocked(participantsApi.fetchParticipants).mockResolvedValue(mockParticipants as any);

    const { result } = renderHook(() => useParticipants(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.participants).toEqual(mockParticipants);
    expect(participantsApi.fetchParticipants).toHaveBeenCalled();
  });

  it('handles update participant mutation', async () => {
    const updateInput = { full_name: 'Updated Name' };
    vi.mocked(participantsApi.updateParticipant).mockResolvedValue({ id: 'u1', ...updateInput } as any);

    const { result } = renderHook(() => useParticipants(), { wrapper: createWrapper() });

    await result.current.updateParticipantAsync('u1', updateInput);

    expect(participantsApi.updateParticipant).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining(updateInput)
    );
  });
});
