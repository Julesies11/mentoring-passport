import { ReactNode } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useOrganisation } from '@/providers/organisation-provider';
import {
  UserCircle,
  Layers,
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
import { toast } from 'sonner';
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from '@/components/ui/avatar';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';
import { Building2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  const { 
    logout, 
    user, 
    isOrgAdmin, 
    memberships, 
    activeMembership, 
    switchOrganisation 
  } = useAuth();
  const { isMasquerading } = useOrganisation();
  const navigate = useNavigate();

  // Use display data from currentUser
  const displayName = user?.full_name || user?.email || 'User';
  const displayEmail = user?.email || '';
  const avatarUrl = getAvatarPublicUrl(user?.avatar_url, user?.id);

  const handleLogout = () => {
    logout();
    navigate('/auth/signin', { replace: true });
  };

  const handleSwitch = async (orgId: string) => {
    if (orgId === activeMembership?.organisation_id) return;
    try {
      await switchOrganisation(orgId);
      toast.success('Switched hospital context');
      navigate('/');
    } catch (error) {
      toast.error('Failed to switch hospital');
    }
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

        {(isOrgAdmin || isMasquerading) && (
          <DropdownMenuItem asChild>
            <Link
              to="/org-admin/programs"
              className="flex items-center gap-2"
            >
              <Layers className="size-4" />
              Mentoring Programs
            </Link>
          </DropdownMenuItem>
        )}

        {memberships.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Switch Hospital</span>
            </div>
            <div className="max-h-[160px] overflow-y-auto px-1">
              {memberships.map((m) => (
                <DropdownMenuItem 
                  key={m.organisation_id}
                  onClick={() => handleSwitch(m.organisation_id)}
                  className="flex items-center justify-between gap-2 cursor-pointer py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className={cn("size-3.5 shrink-0", m.organisation_id === activeMembership?.organisation_id ? "text-primary" : "text-gray-400")} />
                    <div className="flex flex-col min-w-0">
                      <span className={cn("truncate text-xs font-bold leading-none mb-1", m.organisation_id === activeMembership?.organisation_id ? "text-primary" : "text-gray-700")}>
                        {m.organisation?.name}
                      </span>
                      <span className="text-[9px] uppercase font-black text-gray-400 leading-none">
                        Role: {m.role}
                      </span>
                    </div>
                  </div>
                  {m.organisation_id === activeMembership?.organisation_id && (
                    <Check className="size-3.5 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          </>
        )}

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
