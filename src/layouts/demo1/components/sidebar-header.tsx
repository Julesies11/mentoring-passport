import { ChevronFirst } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useSettings } from '@/providers/settings-provider';
import { useOrganisation } from '@/providers/organisation-provider';
import { useAuth } from '@/auth/context/auth-context';
import { Button } from '@/components/ui/button';

export function SidebarHeader() {
  const { settings, storeOption } = useSettings();
  const { activeOrganisation } = useOrganisation();
  const { role } = useAuth();
  const isCollapsed = settings.layouts.demo1.sidebarCollapse;

  const handleToggleClick = () => {
    storeOption(
      'layouts.demo1.sidebarCollapse',
      !settings.layouts.demo1.sidebarCollapse,
    );
  };

  return (
    <div className="sidebar-header hidden lg:flex items-center relative justify-between px-3 lg:px-6 shrink-0">
      <Link to="/" className="flex items-center gap-2 overflow-hidden">
        {(!isCollapsed && role !== 'administrator' && activeOrganisation) ? (
          <div className="flex items-center gap-2.5 animate-in fade-in duration-300">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-black text-xs">{activeOrganisation.name.charAt(0)}</span>
            </div>
            <span className="text-gray-900 font-black uppercase tracking-tight text-xs truncate">
              {activeOrganisation.name}
            </span>
          </div>
        ) : (
          <>
            <div className="dark:hidden">
              <img
                src={toAbsoluteUrl('/media/app/default-logo.png')}
                className="default-logo h-[22px] max-w-none"
                alt="Default Logo"
              />
              <img
                src={toAbsoluteUrl('/media/app/mini-logo.svg')}
                className="small-logo h-[22px] max-w-none"
                alt="Mini Logo"
              />
            </div>
            <div className="hidden dark:block">
              <img
                src={toAbsoluteUrl('/media/app/default-logo-dark.png')}
                className="default-logo h-[22px] max-w-none"
                alt="Default Dark Logo"
              />
              <img
                src={toAbsoluteUrl('/media/app/mini-logo.svg')}
                className="small-logo h-[22px] max-w-none"
                alt="Mini Logo"
              />
            </div>
          </>
        )}
      </Link>

      <Button
        onClick={handleToggleClick}
        size="sm"
        mode="icon"
        variant="outline"
        className={cn(
          'size-7 absolute start-full top-2/4 rtl:translate-x-2/4 -translate-x-2/4 -translate-y-2/4',
          settings.layouts.demo1.sidebarCollapse
            ? 'ltr:rotate-180'
            : 'rtl:rotate-180',
        )}
      >
        <ChevronFirst className="size-4!" />
      </Button>
    </div>
  );
}
