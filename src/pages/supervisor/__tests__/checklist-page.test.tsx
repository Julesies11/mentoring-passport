import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { SupervisorChecklistPage } from '../checklist-page';
import { describe, it, expect, vi } from 'vitest';

// Mock scrollIntoView as it's not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('SupervisorChecklistPage Integration', () => {
  it('loads pairs and allows selecting one to view tasks', async () => {
    render(<SupervisorChecklistPage />);

    // Check if initial empty state is shown
    expect(screen.getByText(/Choose a pair/)).toBeInTheDocument();

    // Select a pair from dropdown
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'p1' } });

    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText('Initial Meeting')).toBeInTheDocument();
    });
  });

  it('opens the "Create Custom Task" dialog when clicking the button', async () => {
    render(<SupervisorChecklistPage />);

    // Select pair first
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } });

    // Click "Add Custom Task"
    await waitFor(() => {
      const addButton = screen.getByText('Add Custom Task');
      fireEvent.click(addButton);
    });

    // Check if dialog opened
    expect(screen.getByText('Create Custom Task')).toBeInTheDocument();
  });
});
