import { useOrganisation } from '@/providers/organisation-provider';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function MasqueradeBanner() {
  const { isMasquerading, activeOrganisation, exitMasquerade } = useOrganisation();
  const navigate = useNavigate();

  if (!isMasquerading) return null;

  const handleExit = () => {
    exitMasquerade();
    toast.info('Exited supervisor mode');
    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="bg-zinc-900 text-white h-[48px] px-4 flex items-center justify-between fixed top-0 left-0 right-0 z-[110] animate-in slide-in-from-top duration-300 shadow-md">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-lg bg-primary flex items-center justify-center animate-pulse">
          <KeenIcon icon="security-user" className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary leading-none mb-0.5">
            Admin Masquerade Mode
          </span>
          <span className="text-xs font-bold leading-none">
            Acting as Supervisor for: <span className="text-primary">{activeOrganisation?.name || 'Loading...'}</span>
          </span>
        </div>
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExit}
        className="h-8 rounded-lg border-white/20 bg-white/10 hover:bg-red-600 hover:border-red-600 text-white font-black text-[10px] uppercase transition-all gap-2"
      >
        <KeenIcon icon="exit-right" className="text-xs" />
        Exit Mode
      </Button>
    </div>
  );
}

