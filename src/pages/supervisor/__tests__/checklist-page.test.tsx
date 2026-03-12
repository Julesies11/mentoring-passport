import { render, screen, fireEvent } from '@/test/utils';
import { SupervisorChecklistPage } from '../checklist-page';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pairsHook from '@/hooks/use-pairs';
import * as tasksHook from '@/hooks/use-tasks';
import * as meetingsHook from '@/hooks/use-meetings';

// Mock scrollIntoView as it's not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock hooks
vi.mock('@/hooks/use-pairs');
vi.mock('@/hooks/use-tasks');
vi.mock('@/hooks/use-meetings');

describe('SupervisorChecklistPage Integration', () => {
  const mockPairs = [
    {
      id: 'p1',
      mentor: { full_name: 'John Mentor' },
      mentee: { full_name: 'Sarah Mentee' },
      status: 'active',
      program: { status: 'active', start_date: new Date().toISOString() }
    }
  ];

  const mockTasks = [
    {
      id: 't1',
      name: 'Initial Meeting',
      status: 'not_submitted',
      subtasks: []
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock usePairs (for the dropdown list)
    vi.mocked(pairsHook.usePairs).mockReturnValue({
      pairs: mockPairs,
      isLoading: false
    } as any);

    // Mock useUserPairs (for the PairingProvider)
    vi.mocked(pairsHook.useUserPairs).mockReturnValue({
      data: mockPairs,
      isLoading: false
    } as any);

    // Mock usePairTasks (for the checklist)
    vi.mocked(tasksHook.usePairTasks).mockReturnValue({
      tasks: mockTasks,
      isLoading: false,
      createCustomTask: vi.fn(),
      updateTaskStatus: vi.fn(),
      updateSubTask: vi.fn(),
      deleteSubTask: vi.fn(),
      reorderSubTasks: vi.fn()
    } as any);

    // Mock useAllMeetings
    vi.mocked(meetingsHook.useAllMeetings).mockReturnValue({
      meetings: [],
      isLoading: false
    } as any);
  });

  it('loads pairs and allows selecting one to view tasks', async () => {
    render(<SupervisorChecklistPage />);

    // Select a pair from dropdown
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'p1' } });

    // Wait for tasks to load - use findAllByText because there are desktop and mobile versions
    const tasks = await screen.findAllByText('Initial Meeting');
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('opens the "Create Custom Task" dialog when clicking the button', async () => {
    render(<SupervisorChecklistPage />);

    // Select pair first
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'p1' } });

    // Click "Add Custom Task"
    const addButton = await screen.findByText('Add Custom Task');
    fireEvent.click(addButton);

    // Check if dialog opened
    const dialogTitle = await screen.findByText('Create Custom Task');
    expect(dialogTitle).toBeInTheDocument();
  });
});
