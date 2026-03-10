import { render } from '@testing-library/react';
import { ProgramSelector } from '@/components/common/program-selector';
import { describe, it, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from '@/auth/context/auth-context';
import { OrganisationProvider } from '@/providers/organisation-provider';
import { mockUser } from './utils';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

const defaultAuth = {
  user: mockUser,
  isSupervisor: true,
  loading: false,
};

describe('App Smoke Test (White Screen Prevention)', () => {
  it('renders the ProgramSelector without crashing', async () => {
    const queryClient = createTestQueryClient();
    
    // If ProgramSelector has a broken import, this will throw an error during transform
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={defaultAuth as any}>
          <OrganisationProvider>
            <ProgramSelector />
          </OrganisationProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
    
    // As long as it renders something (even nothing if programs list is empty), 
    // it means imports are working.
    expect(true).toBe(true);
  });
});
