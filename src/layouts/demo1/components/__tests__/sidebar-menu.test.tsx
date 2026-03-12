import { screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SidebarMenu } from '../sidebar-menu';
import { render } from '@/test/utils';

// Mock the API calls made by providers
vi.mock('@/lib/api/organisations', () => ({
  fetchOrganisation: vi.fn(() => Promise.resolve({ id: 'org1', name: 'Test Org' })),
}));

vi.mock('@/lib/api/programs', () => ({
  fetchPrograms: vi.fn(() => Promise.resolve([])),
  fetchAssignedPrograms: vi.fn(() => Promise.resolve([])),
}));

describe('SidebarMenu', () => {
  it('renders Admin and Supervisor sections for Org Admin', () => {
    render(<SidebarMenu />, {
      authValue: {
        role: 'org-admin',
        isOrgAdmin: true,
        isSupervisor: false,
      },
    });

    // Sections headings
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByText('Supervisor Role')).toBeInTheDocument();

    // Specific links
    expect(screen.getByText('Org Hub')).toBeInTheDocument();
    expect(screen.getByText('Supervisor Hub')).toBeInTheDocument();
    expect(screen.getByText('Programs')).toBeInTheDocument();
    expect(screen.getByText('Pairs')).toBeInTheDocument();
  });

  it('renders only Supervisor Hub for regular Supervisor', () => {
    render(<SidebarMenu />, {
      authValue: {
        role: 'supervisor',
        isOrgAdmin: false,
        isSupervisor: true,
      },
    });

    // Regular supervisor menu doesn't have sections currently in config, 
    // it just lists the items.
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
    expect(screen.getByText('Supervisor Hub')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    
    // Org Admin specific items should NOT be there
    expect(screen.queryByText('Org Hub')).not.toBeInTheDocument();
    expect(screen.queryByText('Programs')).not.toBeInTheDocument();
  });
});
