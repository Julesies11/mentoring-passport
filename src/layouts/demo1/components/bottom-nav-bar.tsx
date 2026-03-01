import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  ClipboardList, 
  Camera, 
  FileText,
  GitBranch
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
    const role = user?.role || 'mentee';
    
    switch (role) {
      case 'supervisor':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/supervisor/dashboard' },
          { icon: Users, label: 'Participants', path: '/supervisor/participants' },
          { icon: GitBranch, label: 'Pairs', path: '/supervisor/pairs' },
          { icon: Camera, label: 'Evidence', path: '/supervisor/evidence-review' },
          { icon: UserCircle, label: 'Profile', path: '/profile/edit' },
        ];
      case 'mentor':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/program-member/dashboard' },
          { icon: ClipboardList, label: 'Tasks', path: '/program-member/tasks' },
          { icon: Camera, label: 'Evidence', path: '/program-member/evidence' },
          { icon: FileText, label: 'Notes', path: '/program-member/notes' },
          { icon: UserCircle, label: 'Profile', path: '/profile/edit' },
        ];
      case 'mentee':
      case 'program-member':
      default:
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/program-member/dashboard' },
          { icon: ClipboardList, label: 'Tasks', path: '/program-member/tasks' },
          { icon: Camera, label: 'Evidence', path: '/program-member/evidence' },
          { icon: FileText, label: 'Notes', path: '/program-member/notes' },
          { icon: UserCircle, label: 'Profile', path: '/profile/edit' },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border lg:hidden">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path || pathname.startsWith(item.path + '/');
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('size-5', isActive && 'stroke-[2.5]')} />
              <span className="text-[10px] leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
