import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';
import { useOrganisation } from '@/providers/organisation-provider';
import { useAuth } from '@/auth/context/auth-context';
import { SidebarHeader } from './sidebar-header';
import { SidebarMenu } from './sidebar-menu';

export function Sidebar() {
  const { settings } = useSettings();
  const { pathname } = useLocation();
  const { isMasquerading } = useOrganisation();
  const { role } = useAuth();

  return (
    <div
      className={cn(
        'sidebar bg-background lg:border-e lg:border-border lg:fixed lg:bottom-0 lg:z-20 lg:flex flex-col items-stretch shrink-0 transition-all duration-300',
        isMasquerading ? 'lg:top-[48px]' : 'lg:top-0',
        (settings.layouts.demo1.sidebarTheme === 'dark' ||
          pathname.includes('dark-sidebar')) &&
          'dark',
      )}
    >
      <SidebarHeader />
      <div className="overflow-hidden">
        <div className="w-(--sidebar-default-width)">
          <SidebarMenu key={`${role}-${isMasquerading}`} />
        </div>
      </div>
    </div>
  );
}
