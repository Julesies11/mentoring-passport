import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Calendar,
  GitBranch,
  ShieldCheck,
  Layers,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/auth/context/auth-context';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { SidebarMenu } from './sidebar-menu';
import { toAbsoluteUrl } from '@/lib/helpers';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  isMenu?: boolean;
}

export function BottomNavBar() {
  const { pathname } = useLocation();
  const { isOrgAdmin, isSupervisor, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu when path changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);
  
  // Role-based navigation items
  const getNavItems = (): NavItem[] => {
    // 1. System Owner
    if (isAdmin) {
      return [
        { icon: LayoutDashboard, label: 'Admin', path: '/admin/dashboard' },
        { icon: Users, label: 'Orgs', path: '/admin/organisations' },
        { icon: ShieldCheck, label: 'Users', path: '/admin/users' },
        { icon: Menu, label: 'Menu', path: '#', isMenu: true },
      ];
    }

    // 2. Org Admin (Fixed Navigation)
    if (isOrgAdmin) {
      return [
        { icon: LayoutDashboard, label: 'Org Hub', path: '/org-admin/hub' },
        { icon: Layers, label: 'Programs', path: '/org-admin/programs' },
        { icon: Users, label: 'Members', path: '/org-admin/participants' },
        { icon: ClipboardList, label: 'Templates', path: '/org-admin/task-templates' },
        { icon: Menu, label: 'Menu', path: '#', isMenu: true },
      ];
    }

    // 3. Supervisor (Direct)
    if (isSupervisor) {
      return [
        { icon: LayoutDashboard, label: 'Hub', path: '/supervisor/hub' },
        { icon: GitBranch, label: 'Pairs', path: '/supervisor/pairs' },
        { icon: ClipboardList, label: 'Tasks', path: '/supervisor/program-tasks' },
        { icon: Menu, label: 'Menu', path: '#', isMenu: true },
      ];
    }

    // 4. Program Members (Mentors/Mentees)
    return [
      { icon: LayoutDashboard, label: 'Hub', path: '/program-member/dashboard' },
      { icon: ClipboardList, label: 'Tasks', path: '/program-member/tasks' },
      { icon: Calendar, label: 'Meetings', path: '/program-member/meetings' },
      { icon: Menu, label: 'Menu', path: '#', isMenu: true },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = !item.isMenu && (pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path)));
          
          if (item.isMenu) {
            return (
              <Sheet key="mobile-menu" open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild>
                  <button
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 px-1 py-1 rounded-xl transition-all duration-200 min-w-[50px] flex-1 text-gray-400 active:scale-90'
                    )}
                  >
                    <div className="p-1 rounded-lg">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-tighter text-center">
                      {item.label}
                    </span>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[280px] border-none">
                  <SheetHeader className="p-5 border-b border-gray-100 flex-row items-center gap-3 space-y-0">
                    <img
                      src={toAbsoluteUrl('/media/app/mini-logo.svg')}
                      className="h-8"
                      alt="Logo"
                    />
                    <SheetTitle className="text-left">Navigation</SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto h-[calc(100dvh-73px)] pb-10">
                    <SidebarMenu />
                  </div>
                </SheetContent>
              </Sheet>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 px-1 py-1 rounded-xl transition-all duration-200 min-w-[50px] flex-1',
                isActive
                  ? 'text-primary'
                  : 'text-gray-400 active:scale-90'
              )}
            >
              <div className={cn(
                "p-1 rounded-lg transition-colors",
                isActive && "bg-primary/10 text-primary"
              )}>
                <Icon className={cn('size-5', isActive && 'stroke-[2.5]')} />
              </div>
              <span className={cn(
                "text-[8px] font-bold uppercase tracking-tighter transition-colors text-center",
                isActive ? "text-primary" : "text-gray-400"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
