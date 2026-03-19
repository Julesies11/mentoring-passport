import { ROLES } from '@/config/constants';
import { screen, render as rtlRender } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupervisorDashboardPage } from '@/pages/supervisor/dashboard-page';
import { render } from '@/test/utils';
import { BottomNavBar } from '@/layouts/demo1/components/bottom-nav-bar';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '@/auth/context/auth-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsProvider } from '@/providers/settings-provider';

// Mock hooks
vi.mock('@/hooks/use-participants', () => ({
  useAllParticipants: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/hooks/use-pairs', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    usePairs: vi.fn(() => ({ pairs: [], isLoading: false })),
  };
});

vi.mock('@/hooks/use-evidence', () => ({
  usePendingEvidence: vi.fn(() => ({ evidence: [], isLoading: false })),
}));

vi.mock('@/hooks/use-tasks', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useAllPairTaskStatuses: vi.fn(() => ({ data: [], isLoading: false })),
  };
});

// Mock organisation provider
vi.mock('@/providers/organisation-provider', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useOrganisation: vi.fn(() => ({ 
      activeProgram: { id: 'p1', name: 'Test Program' }, 
      programs: [{ id: 'p1', name: 'Test Program' }],
      isLoading: false 
    })),
  };
});

// We need to mock useIsMobile to return true for mobile tests
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(),
}));

import { useIsMobile } from '@/hooks/use-mobile';


describe('Mobile UI Standards', () => {
  const mockUser = { id: 's1', email: 'supervisor@test.com', role: ROLES.SUPERVISOR };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides dashboard summary cards on mobile', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    
    render(<SupervisorDashboardPage />, { authValue: { user: mockUser as any } });
    
    const summaryContainer = screen.getByTestId('executive-summary');
    expect(summaryContainer).toBeInTheDocument();
    expect(summaryContainer).toHaveClass('hidden');
    expect(summaryContainer).toHaveClass('sm:grid');
  });

  it('uses table-fixed on mobile for Relationship Progress Tracker', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    
    const { container } = render(<SupervisorDashboardPage />, { authValue: { user: mockUser as any } });
    
    const table = container.querySelector('table');
    expect(table).toHaveClass('table-fixed');
    expect(table).toHaveClass('md:table-auto');
  });

  it('hides toolbar heading on mobile', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    
    render(<SupervisorDashboardPage />, { authValue: { user: mockUser as any } });
    
    const toolbarWrapper = screen.getByTestId('dashboard-toolbar');
    expect(toolbarWrapper).toBeInTheDocument();
    expect(toolbarWrapper).toHaveClass('hidden');
    expect(toolbarWrapper).toHaveClass('sm:block');
  });

  describe('BottomNavBar Fixed Navigation', () => {
    const queryClient = new QueryClient();
    
    const renderBottomNav = (path: string, authValue: any) => {
      // Use rtlRender directly to avoid double Router from the custom render wrapper
      return rtlRender(
        <MemoryRouter initialEntries={[path]}>
          <QueryClientProvider client={queryClient}>
            <SettingsProvider>
              <AuthContext.Provider value={authValue}>
                <BottomNavBar />
              </AuthContext.Provider>
            </SettingsProvider>
          </QueryClientProvider>
        </MemoryRouter>
      );
    };

    it('shows fixed items for Org Admin regardless of path', () => {
      const orgAdminAuth = { 
        isOrgAdmin: true, 
        isSupervisor: true, 
        isAdmin: true,
        role: ROLES.ORG_ADMIN
      };

      const { unmount } = renderBottomNav('/org-admin/hub', orgAdminAuth);

      expect(screen.getByText('Admin Hub')).toBeInTheDocument();
      expect(screen.getByText('Programs')).toBeInTheDocument();
      expect(screen.getByText('Members')).toBeInTheDocument();
      expect(screen.getByText('Templates')).toBeInTheDocument();
      expect(screen.getByText('Menu')).toBeInTheDocument();
      unmount();

      // Check different path
      renderBottomNav('/supervisor/hub', orgAdminAuth);
      expect(screen.getByText('Admin Hub')).toBeInTheDocument();
      expect(screen.getByText('Programs')).toBeInTheDocument();
      expect(screen.getByText('Members')).toBeInTheDocument();
      expect(screen.getByText('Templates')).toBeInTheDocument();
      expect(screen.getByText('Menu')).toBeInTheDocument();
    });

    it('shows Menu item for all roles', () => {
      const supervisorAuth = { 
        isOrgAdmin: false, 
        isSupervisor: true, 
        isAdmin: false,
        role: ROLES.SUPERVISOR
      };

      const { unmount } = renderBottomNav('/supervisor/hub', supervisorAuth);
      expect(screen.getByText('Menu')).toBeInTheDocument();
      unmount();

      const memberAuth = { 
        isOrgAdmin: false, 
        isSupervisor: false, 
        isAdmin: false,
        role: ROLES.PROGRAM_MEMBER
      };

      renderBottomNav('/program-member/dashboard', memberAuth);
      expect(screen.getByText('Menu')).toBeInTheDocument();
    });
  });
});
