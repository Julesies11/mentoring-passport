import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/auth/context/auth-context';
import { UserModel } from '@/auth/lib/models';
import { MemoryRouter } from 'react-router-dom';
import { SettingsProvider } from '@/providers/settings-provider';
import { PairingProvider } from '@/providers/pairing-provider';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export const mockUser: UserModel = {
  id: 'u1',
  email: 'test@example.com',
  role: 'supervisor',
  full_name: 'Test Supervisor',
  avatar_url: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const defaultAuthValue = {
  loading: false,
  setLoading: () => {},
  saveAuth: () => {},
  user: mockUser,
  setUser: () => {},
  login: async () => {},
  register: async () => {},
  requestPasswordReset: async () => {},
  resetPassword: async () => {},
  resendVerificationEmail: async () => {},
  getUser: async () => mockUser,
  updateProfile: async () => mockUser,
  logout: () => {},
  verify: async () => {},
  isAdmin: false,
  role: 'supervisor' as any,
  profileId: 'u1',
  isSupervisor: true,
  isMentor: false,
  isMentee: false,
  setIsMentor: () => {},
  setIsMentee: () => {},
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: Partial<typeof defaultAuthValue>;
  initialEntries?: string[];
}

const customRender = (
  ui: ReactElement,
  { authValue, initialEntries, ...options }: CustomRenderOptions = {},
) => {
  const queryClient = createTestQueryClient();
  
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AuthContext.Provider value={{ ...defaultAuthValue, ...authValue } as any}>
            <PairingProvider>
              {children}
            </PairingProvider>
          </AuthContext.Provider>
        </SettingsProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return render(ui, { wrapper: AllTheProviders, ...options });
};

export * from '@testing-library/react';
export { customRender as render };
