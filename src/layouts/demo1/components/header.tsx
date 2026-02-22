import { NotificationsSheet } from '@/partials/topbar/notifications-sheet';
import { UserDropdownMenu } from '@/partials/topbar/user-dropdown-menu';
import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useScrollPosition } from '@/hooks/use-scroll-position';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';
import { Breadcrumb } from './breadcrumb';

export function Header() {
  const mobileMode = useIsMobile();

  const scrollPosition = useScrollPosition();
  const headerSticky: boolean = scrollPosition > 0;

  return (
    <header
      className={cn(
        'header fixed top-0 z-10 start-0 flex items-stretch shrink-0 border-b border-transparent bg-background end-0 pe-[var(--removed-body-scroll-bar-size,0px)]',
        headerSticky && 'border-b border-border',
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
          <Breadcrumb />
        )}

        {/* Right: Notifications + User Avatar */}
        <div className="flex items-center gap-3">
          <NotificationsSheet
            trigger={
              <Button
                variant="ghost"
                mode="icon"
                shape="circle"
                className="size-9 hover:bg-primary/10 hover:[&_svg]:text-primary"
              >
                <Bell className="size-4.5!" />
              </Button>
            }
          />
          <UserDropdownMenu
            trigger={
              <img
                className="size-9 rounded-full border-2 border-green-500 shrink-0 cursor-pointer"
                src={toAbsoluteUrl('/media/avatars/300-2.png')}
                alt="User Avatar"
              />
            }
          />
        </div>
      </Container>
    </header>
  );
}
