import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Calendar,
  GitBranch,
  ShieldCheck,
  Layers,
  Settings,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/auth/context/auth-context';
import { useOrganisation } from '@/providers/organisation-provider';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

export function BottomNavBar() {
  const { pathname } = useLocation();
  const { user, isOrgAdmin, isSupervisor, isAdmin } = useAuth();
  const { isMasquerading, isMasqueradingAsSupervisor } = useOrganisation();
  
  // Role-based navigation items
  const getNavItems = (): NavItem[] => {
    // 1. System Owner
    if (isAdmin) {
      return [
        { icon: LayoutDashboard, label: 'Admin', path: '/admin/dashboard' },
        { icon: Users, label: 'Orgs', path: '/admin/organisations' },
        { icon: ShieldCheck, label: 'Users', path: '/admin/users' },
      ];
    }

    // 2. Org Admin
    if (isOrgAdmin) {
      return [
        { icon: LayoutDashboard, label: 'Org Hub', path: '/org-admin/hub' },
        { icon: Layers, label: 'Programs', path: '/org-admin/programs' },
        { icon: Users, label: 'Members', path: '/org-admin/participants' },
        { icon: ClipboardList, label: 'Templates', path: '/org-admin/task-templates' },
      ];
    }

    // 3. Supervisor (Direct)
    if (isSupervisor) {
      return [
        { icon: LayoutDashboard, label: 'Hub', path: '/supervisor/hub' },
        { icon: Users, label: 'Members', path: '/org-admin/participants' },
        { icon: GitBranch, label: 'Pairs', path: '/supervisor/pairs' },
        { icon: ClipboardList, label: 'Tasks', path: '/supervisor/program-tasks' },
        { icon: ShieldCheck, label: 'Review', path: '/supervisor/evidence-review' },
      ];
    }

    // 4. Program Members (Mentors/Mentees)
    return [
      { icon: LayoutDashboard, label: 'Hub', path: '/program-member/dashboard' },
      { icon: ClipboardList, label: 'Tasks', path: '/program-member/tasks' },
      { icon: Calendar, label: 'Meetings', path: '/program-member/meetings' },
      { icon: Users, label: 'Partner', path: '/program-member/mentor' },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          
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
