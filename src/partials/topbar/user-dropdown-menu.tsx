import { ReactNode } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import {
  UserCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from '@/components/ui/avatar';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  const { 
    logout, 
    user
  } = useAuth();
  const navigate = useNavigate();

  // Use display data from currentUser
  const displayName = user?.full_name || user?.email || 'User';
  const displayEmail = user?.email || '';
  const avatarUrl = getAvatarPublicUrl(user?.avatar_url, user?.id);

  const handleLogout = () => {
    logout();
    navigate('/auth/signin', { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" side="bottom" align="end">
        {/* Header */}
        <div className="flex items-center gap-3 p-3">
          <Avatar className="size-10">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-gray-900 truncate">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {displayEmail}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Menu Items */}
        <DropdownMenuItem asChild>
          <Link
            to="/profile/edit"
            className="flex items-center gap-2"
          >
            <UserCircle className="size-4" />
            My Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Footer */}
        <div className="p-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
