import { useAuth } from '@/auth/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function OrgSelectionPage() {
  const { user, memberships, switchOrganisation } = useAuth();
  const navigate = useNavigate();

  const handleSelect = async (orgId: string) => {
    try {
      await switchOrganisation(orgId);
      toast.success('Hospital context selected');
      navigate('/'); // RoleBasedRedirect will handle the rest
    } catch (error) {
      console.error('Failed to select hospital:', error);
      toast.error('Failed to select hospital');
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-[500px] px-4">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Select your Hospital</h1>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
          Welcome back, {user?.full_name || user?.email}
        </p>
      </div>

      <div className="grid gap-4">
        {memberships.map((membership) => (
          <Card 
            key={membership.organisation_id} 
            className="group cursor-pointer hover:border-primary hover:shadow-xl transition-all duration-300 border-2"
            onClick={() => handleSelect(membership.organisation_id)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-primary-light flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Building2 className="size-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-black text-gray-900 uppercase tracking-tight group-hover:text-primary transition-colors">
                      {membership.organisation?.name || 'Unknown Hospital'}
                    </span>
                    <Badge variant="outline" className="w-fit font-black uppercase text-[9px] mt-1 border-none bg-gray-100 text-gray-600">
                      Role: {membership.role}
                    </Badge>
                  </div>
                </div>
                <ArrowRight className="size-5 text-gray-300 group-hover:text-primary transition-all translate-x-0 group-hover:translate-x-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-4">
        <Button 
          variant="link" 
          onClick={() => navigate('/auth/signin')}
          className="text-xs font-black uppercase text-gray-400 hover:text-primary"
        >
          Sign in with a different account
        </Button>
      </div>
    </div>
  );
}

function Badge({ children, _variant, className }: any) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
