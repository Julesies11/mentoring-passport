import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { OrgAdminJobTitlesPage } from '../job-titles';
import { useJobTitles } from '@/hooks/use-job-titles';
import { useParticipants } from '@/hooks/use-participants';

// Mock the hooks
vi.mock('@/hooks/use-job-titles', () => ({
  useJobTitles: vi.fn(),
}));

vi.mock('@/hooks/use-participants', () => ({
  useParticipants: vi.fn(),
}));

describe('OrgAdminJobTitlesPage', () => {
  const mockJobTitles = [
    { id: 'jt1', title: 'Registrar', is_active: true, created_at: new Date().toISOString() },
    { id: 'jt2', title: 'Consultant', is_active: false, created_at: new Date().toISOString() },
  ];

  const mockParticipants = [
    { id: 'u1', full_name: 'John Doe', job_title_id: 'jt1', status: 'active', avatar_url: null },
    { id: 'u2', full_name: 'Jane Smith', job_title_id: 'jt1', status: 'active', avatar_url: 'jane.jpg' },
    { id: 'u3', full_name: 'Inactive User', job_title_id: 'jt1', status: 'archived', avatar_url: null },
  ];

  const mockCreateJobTitle = vi.fn();
  const mockUpdateJobTitle = vi.fn();
  const mockToggleJobTitleStatus = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useJobTitles).mockReturnValue({
      jobTitles: mockJobTitles,
      isLoading: false,
      createJobTitle: mockCreateJobTitle,
      updateJobTitle: mockUpdateJobTitle,
      toggleJobTitleStatus: mockToggleJobTitleStatus,
      isCreating: false,
      isUpdating: false,
      isToggling: false,
    } as any);

    vi.mocked(useParticipants).mockReturnValue({
      participants: mockParticipants,
      isLoading: false,
    } as any);
  });

  it('renders correctly with job titles and mapped participants', () => {
    render(<OrgAdminJobTitlesPage />);
    
    expect(screen.getByText('Managed Job Titles')).toBeDefined();
    expect(screen.getByText('Registrar')).toBeDefined();
    
    // Check participants in column
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('Jane Smith')).toBeDefined();
    
    // Inactive user should not be listed
    expect(screen.queryByText('Inactive User')).toBeNull();
    
    // Status badges
    expect(screen.getByText('Active')).toBeDefined();
    expect(screen.getByText('Inactive')).toBeDefined();
  });

  it('opens edit dialog when clicking a table row', () => {
    render(<OrgAdminJobTitlesPage />);
    
    // Find the row for Registrar
    const row = screen.getByText('Registrar').closest('tr');
    if (!row) throw new Error('Row not found');
    
    fireEvent.click(row);
    
    expect(screen.getByText('Edit Job Title')).toBeDefined();
    expect(screen.getByLabelText(/Job Title Name/i)).toHaveValue('Registrar');
    expect(screen.getByLabelText(/Active Status/i)).toBeChecked();
  });

  it('opens edit dialog when clicking the edit button', () => {
    render(<OrgAdminJobTitlesPage />);
    
    const editButtons = screen.getAllByTitle('Edit');
    fireEvent.click(editButtons[0]);
    
    expect(screen.getByText('Edit Job Title')).toBeDefined();
    expect(screen.getByLabelText(/Job Title Name/i)).toHaveValue('Registrar');
  });

  it('submits updated status when toggling checkbox', async () => {
    render(<OrgAdminJobTitlesPage />);
    
    // Open Registrar edit
    fireEvent.click(screen.getByText('Registrar'));
    
    // Uncheck active status
    const checkbox = screen.getByLabelText(/Active Status/i);
    fireEvent.click(checkbox);
    
    const submitButton = screen.getByRole('button', { name: /Update Title/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockToggleJobTitleStatus).toHaveBeenCalledWith({ id: 'jt1', isActive: false });
    });
  });

  it('submits new job title', async () => {
    render(<OrgAdminJobTitlesPage />);
    
    fireEvent.click(screen.getByRole('button', { name: /New Job Title/i }));
    
    const input = screen.getByLabelText(/Job Title Name/i);
    fireEvent.change(input, { target: { value: 'Senior Registrar' } });
    
    const submitButton = screen.getByRole('button', { name: /Create Title/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateJobTitle).toHaveBeenCalledWith('Senior Registrar');
    });
  });
});
