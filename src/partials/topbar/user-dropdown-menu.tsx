import { ReactNode } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import {
  IdCard,
  Moon,
  UserCircle,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link, useNavigate } from 'react-router';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  const { logout, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Use display data from currentUser
  const displayName = user?.full_name || user?.email || 'User';
  const displayEmail = user?.email || '';
  const displayAvatar = user?.avatar_url ? 
    `https://rdnaqrzqpcicskylmsyl.supabase.co/storage/v1/object/mp-avatars/${user?.id}/${user.avatar_url}` :
    toAbsoluteUrl('/media/avatars/300-2.png');

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

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
          <img
            className="size-10 rounded-full border border-gray-200 object-cover"
            src={displayAvatar}
            alt="User avatar"
          />
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
            <UserCircle />
            My Profile
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Footer */}
        <DropdownMenuItem
          className="flex items-center gap-2"
          onSelect={(event) => event.preventDefault()}
        >
          <Moon />
          <div className="flex items-center gap-2 justify-between grow">
            Dark Mode
            <Switch
              size="sm"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeToggle}
            />
          </div>
        </DropdownMenuItem>
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
