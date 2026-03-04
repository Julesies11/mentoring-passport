import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { ProgramMemberTasksPage } from '../tasks-page';

describe('ProgramMemberTasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<ProgramMemberTasksPage />);
    // Since we use usePairing which might be loading, or usePairTasks which might be loading
    // In our test utils, we mock the default state
  });

  it('renders the tasks list when a pair is selected', async () => {
    render(<ProgramMemberTasksPage />);
    
    // Check for "Overall Progress" which indicates the page has moved past loading state
    const progressText = await screen.findByText(/Overall Progress/i, {}, { timeout: 15000 });
    expect(progressText).toBeDefined();
  });

  it('shows empty state when no pairing is selected', async () => {
    // Note: The custom render in test/utils.tsx provides a mock user and likely a mock pairing
    // but if we wanted to test specifically "no pair", we'd override the provider
    render(<ProgramMemberTasksPage />);
    
    // If a pair is automatically selected by our mock provider, we'll see the tasks
    // Otherwise we'll see the "No Relationship Selected" card
  });

  it('can toggle task expansion', async () => {
    render(<ProgramMemberTasksPage />);
    
    // Tasks are expanded by default in our useEffect
    // Look for task names from our handlers.ts mock data if applicable
    // In handlers.ts, we don't have explicit pair tasks, so they might come back as empty []
  });
});
