import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MENU_SIDEBAR } from '@/config/menu.config';
import { useMenu } from '@/hooks/use-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSettings } from '@/providers/settings-provider';
import { useOrganisation } from '@/providers/organisation-provider';
import { Header } from './components/header';
import { Sidebar } from './components/sidebar';
import { BottomNavBar } from './components/bottom-nav-bar';
import { MasqueradeBanner } from '@/components/common/masquerade-banner';

export function Demo1Layout() {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const { isMasquerading } = useOrganisation();
  const { getCurrentItem } = useMenu(pathname);
  const item = getCurrentItem(MENU_SIDEBAR);
  const { settings, setOption } = useSettings();

  useEffect(() => {
    const bodyClass = document.body.classList;

    if (settings.layouts.demo1.sidebarCollapse) {
      bodyClass.add('sidebar-collapse');
    } else {
      bodyClass.remove('sidebar-collapse');
    }
  }, [settings]); // Runs only on settings update

  useEffect(() => {
    // Set current layout
    setOption('layout', 'demo1');
  }, [setOption]);

  useEffect(() => {
    const bodyClass = document.body.classList;

    // Add a class to the body element
    bodyClass.add('demo1');
    bodyClass.add('sidebar-fixed');
    bodyClass.add('header-fixed');

    const timer = setTimeout(() => {
      bodyClass.add('layout-initialized');
    }, 1000); // 1000 milliseconds

    // Remove the class when the component is unmounted
    return () => {
      bodyClass.remove('demo1');
      bodyClass.remove('sidebar-fixed');
      bodyClass.remove('sidebar-collapse');
      bodyClass.remove('header-fixed');
      bodyClass.remove('layout-initialized');
      clearTimeout(timer);
    };
  }, []); // Runs only once on mount

  useEffect(() => {
    if (item?.title) {
      document.title = item.title;
    }
  }, [item?.title]);

  return (
    <>
      {!isMobile && <Sidebar />}

      <div className="wrapper flex grow flex-col">
        <MasqueradeBanner />
        <Header />

        <main className={cn("grow", isMobile ? "pt-5 pb-20" : (isMasquerading ? "pt-[118px]" : "pt-[70px]"))} role="content">
          <Outlet />
        </main>
      </div>

      {isMobile && <BottomNavBar />}
    </>
  );
}
