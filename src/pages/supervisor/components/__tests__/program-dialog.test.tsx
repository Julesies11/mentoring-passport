import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { ProgramDialog } from '../program-dialog';

// Mock useTaskLists hook
vi.mock('@/hooks/use-tasks', () => ({
  useTaskLists: () => ({ data: [] }),
}));

describe('ProgramDialog', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();
  const mockSupervisors = [
    { id: 's1', full_name: 'Supervisor One', email: 's1@example.com', assigned_program_ids: [] },
    { id: 's2', full_name: 'Supervisor Two', email: 's2@example.com', assigned_program_ids: ['p1'] },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly for creating a new program', () => {
    render(
      <ProgramDialog 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit}
        allSupervisors={mockSupervisors}
      />
    );
    
    expect(screen.getByText('Add New Program')).toBeDefined();
    expect(screen.getByLabelText(/Program Name \*/i)).toBeDefined();
    expect(screen.getByText(/No supervisors assigned yet/i)).toBeDefined();
  });

  it('pre-selects supervisors when editing an existing program', () => {
    const program = {
      id: 'p1',
      organisation_id: 'org1',
      name: 'Existing Program',
      status: 'active' as const,
      task_list_id: null,
      start_date: null,
      end_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(
      <ProgramDialog 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit}
        program={program}
        allSupervisors={mockSupervisors}
      />
    );
    
    expect(screen.getByText('Edit Program')).toBeDefined();
    expect(screen.getByLabelText(/Program Name \*/i)).toHaveValue('Existing Program');
    // Supervisor Two should be pre-selected (shown in assigned count)
    expect(screen.getByText(/1 Assigned/i)).toBeDefined();
  });

  it('toggles supervisor selection via manage button', async () => {
    render(
      <ProgramDialog 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit}
        allSupervisors={mockSupervisors}
      />
    );
    
    // Open the manage popover
    const manageButton = screen.getByRole('button', { name: /Manage/i });
    fireEvent.click(manageButton);
    
    // Find supervisor in the popover and click
    const supervisorItem = screen.getByText('Supervisor One');
    fireEvent.click(supervisorItem);
    
    expect(screen.getByText(/1 Assigned/i)).toBeDefined();
    
    // Click again to deselect
    fireEvent.click(supervisorItem);
    expect(screen.getByText(/No supervisors assigned yet/i)).toBeDefined();
  });

  it('submits form with selected supervisors', async () => {
    render(
      <ProgramDialog 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit}
        allSupervisors={mockSupervisors}
      />
    );
    
    fireEvent.change(screen.getByLabelText(/Program Name \*/i), { target: { value: 'New Program' } });
    
    // Open popover and select supervisor
    const manageButton = screen.getByRole('button', { name: /Manage/i });
    fireEvent.click(manageButton);
    const supervisorItem = screen.getByText('Supervisor One');
    fireEvent.click(supervisorItem);
    
    const submitButton = screen.getByRole('button', { name: /Create Program/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Program',
        supervisor_ids: ['s1'],
        status: 'active'
      }));
    });
  });
});

