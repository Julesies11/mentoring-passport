import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useJobTitles } from '../use-job-titles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as jobTitlesApi from '@/lib/api/job-titles';

// Mock useOrganisation
vi.mock('@/providers/organisation-provider', () => ({
  useOrganisation: vi.fn(() => ({
    activeOrganisation: { id: 'org1' },
    isLoading: false
  })),
}));

// Mock the API layer
vi.mock('@/lib/api/job-titles', () => ({
  fetchJobTitles: vi.fn(),
  createJobTitle: vi.fn(),
  updateJobTitle: vi.fn(),
  deleteJobTitle: vi.fn(),
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

describe('useJobTitles Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches job titles correctly', async () => {
    const mockTitles = [{ id: 'jt1', title: 'Registrar' }];
    vi.mocked(jobTitlesApi.fetchJobTitles).mockResolvedValue(mockTitles as any);

    const { result } = renderHook(() => useJobTitles(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.jobTitles).toEqual(mockTitles);
    expect(jobTitlesApi.fetchJobTitles).toHaveBeenCalledWith('org1');
  });

  it('handles create job title mutation', async () => {
    vi.mocked(jobTitlesApi.createJobTitle).mockResolvedValue({ id: 'jt2', title: 'New' } as any);

    const { result } = renderHook(() => useJobTitles(), { wrapper: createWrapper() });

    await result.current.createJobTitle('New');

    expect(jobTitlesApi.createJobTitle).toHaveBeenCalledWith('org1', 'New');
  });

  it('handles update job title mutation', async () => {
    vi.mocked(jobTitlesApi.updateJobTitle).mockResolvedValue({ id: 'jt1', title: 'Updated' } as any);

    const { result } = renderHook(() => useJobTitles(), { wrapper: createWrapper() });

    await result.current.updateJobTitle({ id: 'jt1', title: 'Updated' });

    expect(jobTitlesApi.updateJobTitle).toHaveBeenCalledWith('jt1', 'Updated');
  });

  it('handles delete job title mutation', async () => {
    vi.mocked(jobTitlesApi.deleteJobTitle).mockResolvedValue(undefined as any);

    const { result } = renderHook(() => useJobTitles(), { wrapper: createWrapper() });

    await result.current.deleteJobTitle('jt1');

    expect(jobTitlesApi.deleteJobTitle).toHaveBeenCalledWith('jt1');
  });
});
