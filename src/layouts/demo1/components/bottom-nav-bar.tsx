import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  Calendar,
  GitBranch,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/auth/context/auth-context';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

export function BottomNavBar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  
  // Role-based navigation items
  const getNavItems = (): NavItem[] => {
    const role = user?.role || 'program-member';
    
    if (role === 'supervisor') {
      return [
        { icon: LayoutDashboard, label: 'Hub', path: '/supervisor/dashboard' },
        { icon: Users, label: 'Members', path: '/supervisor/participants' },
        { icon: GitBranch, label: 'Pairs', path: '/supervisor/pairs' },
        { icon: ClipboardList, label: 'Tasks', path: '/supervisor/master-tasks' },
        { icon: ShieldCheck, label: 'Review', path: '/supervisor/evidence-review' },
        { icon: Calendar, label: 'Calendar', path: '/supervisor/calendar' },
      ];
    }

    // Program Members (Mentors/Mentees)
    return [
      { icon: LayoutDashboard, label: 'Hub', path: '/program-member/dashboard' },
      { icon: ClipboardList, label: 'Tasks', path: '/program-member/tasks' },
      { icon: Calendar, label: 'Meetings', path: '/program-member/meetings' },
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
