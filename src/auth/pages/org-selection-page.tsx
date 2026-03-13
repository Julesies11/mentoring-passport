import { useAuth } from '@/auth/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ROLES } from '@/config/constants';
import { OrganisationLogo } from '@/components/common/organisation-logo';

export function OrgSelectionPage() {
  const { user, memberships, switchOrganisation, logout, loading } = useAuth();
  const navigate = useNavigate();

  const handleSelect = async (orgId: string) => {
    try {
      const promise = switchOrganisation(orgId);
      toast.promise(promise, {
        loading: 'Switching organisation context...',
        success: 'Organisation context selected successfully',
        error: 'Failed to switch organisation context'
      });
      
      await promise;
      navigate('/'); // RoleBasedRedirect will handle the rest
    } catch (error) {
      console.error('Failed to select organisation:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case ROLES.ADMINISTRATOR:
        return <Badge variant="destructive" appearance="light" size="xs" className="uppercase font-black tracking-widest">Admin</Badge>;
      case ROLES.ORG_ADMIN:
        return <Badge variant="primary" appearance="light" size="xs" className="uppercase font-black tracking-widest">Org Admin</Badge>;
      case ROLES.SUPERVISOR:
        return <Badge variant="info" appearance="light" size="xs" className="uppercase font-black tracking-widest">Supervisor</Badge>;
      case ROLES.PROGRAM_MEMBER:
        return <Badge variant="success" appearance="light" size="xs" className="uppercase font-black tracking-widest">Participant</Badge>;
      default:
        return <Badge variant="secondary" appearance="light" size="xs" className="uppercase font-black tracking-widest">{role}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-10 w-full max-w-[550px] mx-auto px-6 py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 text-center">
        <div className="flex justify-center mb-2">
          <div className="size-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-xs border border-primary/5">
            <KeenIcon icon="bank" className="text-4xl" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
          Select Organisation
        </h1>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
          Welcome back, <span className="text-gray-700">{user?.full_name || user?.email}</span>.<br /> 
          Please select an organisation context to continue.
        </p>
      </div>

      <div className="grid gap-4">
        {memberships.length === 0 && !loading && (
          <Card className="border-dashed border-2 border-amber-200 bg-amber-50/50 rounded-3xl">
            <CardContent className="p-10 text-center flex flex-col items-center gap-4">
              <div className="size-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                <KeenIcon icon="information-2" className="text-2xl" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-amber-800 uppercase tracking-widest">No active memberships</p>
                <p className="text-xs text-amber-600 font-medium leading-relaxed">
                  Your account is not currently assigned to any organization.<br />
                  Please contact your system administrator for assistance.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {memberships.map((membership) => (
          <Card 
            key={membership.organisation_id} 
            className={cn(
              "group cursor-pointer border border-gray-200 transition-all duration-300 rounded-[2rem] hover:shadow-xl hover:shadow-primary/5 active:scale-[0.98]",
              "hover:border-primary/30 hover:bg-primary/[0.01]"
            )}
            onClick={() => handleSelect(membership.organisation_id)}
          >
            <CardContent className="p-0 text-card-foreground">
              <div className="flex items-center gap-5 p-5">
                <OrganisationLogo 
                  orgId={membership.organisation_id}
                  logoPath={membership.organisation?.logo_url}
                  name={membership.organisation?.name}
                  size="lg"
                  className="rounded-2xl border-none shadow-sm group-hover:scale-105 transition-transform"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-black text-gray-900 uppercase tracking-tight text-base truncate group-hover:text-primary transition-colors">
                      {membership.organisation?.name || 'Unknown Organisation'}
                    </h3>
                    {membership.status === 'active' && (
                      <KeenIcon icon="check-circle" className="text-success text-base shrink-0" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {getRoleBadge(membership.role)}
                    
                    {membership.organisation_id === user?.organisation_id && (
                      <Badge variant="primary" size="xs" shape="circle" className="px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter">
                        Current
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="size-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white transition-all -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 shrink-0 shadow-sm">
                  <KeenIcon icon="arrow-right" className="text-lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col items-center gap-6 mt-4 border-t border-gray-100 pt-10">
        <button 
          onClick={() => logout()}
          className="group flex items-center gap-2.5 px-6 py-2 rounded-full hover:bg-red-50 transition-all duration-300"
        >
          <KeenIcon icon="exit-right" className="text-gray-400 group-hover:text-red-500 transition-colors" />
          <span className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-red-600 transition-colors">
            Sign out of this account
          </span>
        </button>
        
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] flex items-center gap-2">
          Mentoring Passport <span className="size-1 bg-gray-200 rounded-full"></span> &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
