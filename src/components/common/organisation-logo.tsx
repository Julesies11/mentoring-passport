import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getOrganisationLogoUrl } from '@/lib/api/organisations';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';

interface OrganisationLogoProps {
  orgId: string;
  logoPath?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function OrganisationLogo({
  orgId,
  logoPath,
  name,
  size = 'md',
  className,
}: OrganisationLogoProps) {
  const logoUrl = logoPath ? getOrganisationLogoUrl(orgId, logoPath) : null;

  const sizeClasses = {
    xs: 'size-6',
    sm: 'size-8',
    md: 'size-10',
    lg: 'size-16',
    xl: 'size-24',
  };

  const getInitials = (orgName?: string) => {
    if (!orgName) return 'O';
    return orgName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage 
        src={logoUrl || undefined} 
        alt={name || 'Organisation Logo'} 
        className="object-contain p-1"
      />
      <AvatarFallback className="bg-primary/10 text-primary border border-primary/5 text-[10px] font-black">
        {name ? getInitials(name) : <Building2 className={cn(
          size === 'xs' ? 'size-3' :
          size === 'sm' ? 'size-4' : 
          size === 'md' ? 'size-5' : 
          size === 'lg' ? 'size-8' : 'size-12'
        )} />}
      </AvatarFallback>
    </Avatar>
  );
}
