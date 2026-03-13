import { AppRouting } from '@/routing/app-routing';
import { BrowserRouter } from 'react-router-dom';
import { LoadingBarContainer } from 'react-top-loading-bar';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/auth/providers/supabase-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { ModulesProvider } from '@/providers/modules-provider';
import { QueryProvider } from '@/providers/query-provider';
import { SettingsProvider } from '@/providers/settings-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { TooltipsProvider } from '@/providers/tooltips-provider';
import { PairingProvider } from '@/providers/pairing-provider';
import { OrganisationProvider } from '@/providers/organisation-provider';
import { ConnectivityListener } from '@/components/common/connectivity-listener';

const { BASE_URL } = import.meta.env;

export function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ThemeProvider>
          <I18nProvider>
            <TooltipsProvider>
              <QueryProvider>
                <OrganisationProvider>
                  <LoadingBarContainer>
                    <BrowserRouter basename={BASE_URL}>
                      <Toaster />
                      <ConnectivityListener />
                      <ModulesProvider>
                        <PairingProvider>
                          <AppRouting />
                        </PairingProvider>
                      </ModulesProvider>
                    </BrowserRouter>
                  </LoadingBarContainer>
                </OrganisationProvider>
              </QueryProvider>
            </TooltipsProvider>
          </I18nProvider>
        </ThemeProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
