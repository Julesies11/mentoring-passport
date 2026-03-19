import { ROLES } from '@/config/constants';
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/auth/context/auth-context';
import { UserModel } from '@/auth/lib/models';
import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from '@/providers/settings-provider';
import { PairingProvider } from '@/providers/pairing-provider';
import { OrganisationProvider } from '@/providers/organisation-provider';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export const mockUser: UserModel = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  role: ROLES.SUPERVISOR,
  full_name: 'Test Supervisor',
  avatar_url: '',
  organisation_id: '00000000-0000-0000-0000-000000000002',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultAuthValue = {
  loading: false,
  setLoading: () => {},
  saveAuth: () => {},
  user: { ...mockUser },
  setUser: () => {},
  login: async () => {},
  register: async (
    _email: string,
    _password: string,
    _password_confirmation: string,
    _firstName?: string,
    _lastName?: string,
  ) => {},
  requestPasswordReset: async (_email: string) => {},
  resetPassword: async (
    _password: string,
    _password_confirmation: string,
  ) => {},
  resendVerificationEmail: async (_email: string) => {},
  getUser: async () => mockUser,
  updateProfile: async () => mockUser,
  logout: () => {},
  verify: async () => {},
  isAdmin: false,
  role: ROLES.SUPERVISOR as any,
  profileId: '00000000-0000-0000-0000-000000000001',
  isSystemOwner: false,
  isOrgAdmin: false,
  isSupervisor: true,
  isMentor: false,
  isMentee: false,
  setIsMentor: () => {},
  setIsMentee: () => {},
  memberships: [],
  switchOrganisation: async () => {},
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: Partial<typeof defaultAuthValue>;
}

const customRender = (
  ui: ReactElement,
  { authValue, ...options }: CustomRenderOptions = {},
) => {
  const queryClient = createTestQueryClient();
  
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AuthContext.Provider value={{ ...defaultAuthValue, ...authValue } as any}>
            <OrganisationProvider>
              <PairingProvider>
                {children}
              </PairingProvider>
            </OrganisationProvider>
          </AuthContext.Provider>
        </SettingsProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: AllTheProviders, ...options });
};

export * from '@testing-library/react';
export { customRender as render };
