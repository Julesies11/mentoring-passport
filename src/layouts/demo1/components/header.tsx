import { NotificationsSheet } from '@/partials/topbar/notifications-sheet';
import { UserDropdownMenu } from '@/partials/topbar/user-dropdown-menu';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/auth/context/auth-context';
import { useOrganisation } from '@/providers/organisation-provider';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { Breadcrumb } from './breadcrumb';

export function Header() {
  const mobileMode = useIsMobile();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const { isMasquerading } = useOrganisation();

  const scrollPosition = useScrollPosition();
  const headerSticky: boolean = scrollPosition > 0;

  return (
    <header
      className={cn(
        'header fixed start-0 flex items-stretch shrink-0 border-b border-transparent bg-background end-0 pe-[var(--removed-body-scroll-bar-size,0px)] transition-all duration-300',
        isMasquerading ? 'top-[48px] z-[100]' : 'top-0 z-10',
        'pt-[env(safe-area-inset-top)]',
        headerSticky && 'border-b border-border shadow-sm',
      )}
    >
      <Container className="flex justify-between items-stretch lg:gap-4">
        {/* Mobile: Logo on left, Desktop: Breadcrumbs */}
        {mobileMode ? (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {/* Breadcrumb or title could go here if needed, but keeping it clean for now */}
          </div>
        ) : (
          <div className="flex items-center gap-4 flex-1">
            <Breadcrumb />
          </div>
        )}

        {/* Right: Notifications + User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
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
