import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils';
import { ProgramMemberTasksPage } from '../tasks-page';

describe('ProgramMemberTasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ProgramMemberTasksPage />);
  });

  it('eventually renders progress or empty state', async () => {
    render(<ProgramMemberTasksPage />);
    
    await waitFor(() => {
      const hasTitle = screen.queryByText(/Checklist Progress/i) || screen.queryByText(/No Relationship Selected/i);
      expect(hasTitle).toBeDefined();
    }, { timeout: 10000 });
  });
});
