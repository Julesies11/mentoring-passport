import { NotificationsSheet } from '@/partials/topbar/notifications-sheet';
import { UserDropdownMenu } from '@/partials/topbar/user-dropdown-menu';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/auth/context/auth-context';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { Breadcrumb } from './breadcrumb';
import { ProgramSelector } from '@/components/common/program-selector';

export function Header() {
  const mobileMode = useIsMobile();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();

  const scrollPosition = useScrollPosition();
  const headerSticky: boolean = scrollPosition > 0;

  return (
    <header
      className={cn(
        'header fixed top-0 z-10 start-0 flex items-stretch shrink-0 border-b border-transparent bg-background end-0 pe-[var(--removed-body-scroll-bar-size,0px)]',
        'pt-[env(safe-area-inset-top)]',
        headerSticky && 'border-b border-border shadow-sm transition-all',
      )}
    >
      <Container className="flex justify-between items-stretch lg:gap-4">
        {/* Mobile: Logo on left, Desktop: Breadcrumbs */}
        {mobileMode ? (
          <div className="flex items-center gap-2.5">
            <Link to="/" className="shrink-0">
              <img
                src={toAbsoluteUrl('/media/app/mini-logo.svg')}
                className="h-[25px] w-full"
                alt="mini-logo"
              />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-4 flex-1">
            <Breadcrumb />
          </div>
        )}

        {/* Right: Program Selector + Notifications + User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ProgramSelector />
          <NotificationsSheet
            trigger={
              <Button
                variant="ghost"
                mode="icon"
                shape="circle"
                className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary relative transition-all duration-200"
              >
                <Bell className={cn(
                  "size-4.5 transition-colors",
                  unreadCount > 0 ? "text-primary" : "text-gray-500"
                )} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-background shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            }
          />
          <UserDropdownMenu
            trigger={
              <div className="cursor-pointer">
                <ProfileAvatar
                  userId={user?.id || ''}
                  currentAvatar={user?.avatar_url}
                  userName={user?.full_name || user?.email}
                  size="md"
                  showEditButton={false}
                />
              </div>
            }
          />
        </div>
      </Container>
    </header>
  );
}
