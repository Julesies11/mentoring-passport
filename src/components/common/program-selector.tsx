import { useLocation } from 'react-router-dom';
import { useOrganisation } from '@/providers/organisation-provider';
import { useAuth } from '@/auth/context/auth-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

export function ProgramSelector() {
  const { pathname } = useLocation();
  const { programs, activeProgram, isLoading, setActiveProgram, isMasquerading } = useOrganisation();
  const { isSupervisor, isOrgAdmin } = useAuth();

  // Show for supervisors, org admins, or masquerading administrators
  if (!isSupervisor && !isMasquerading && !isOrgAdmin) return null;

  // Show skeleton during initial load
  if (isLoading) {
    return <div className="h-8 w-[220px] sm:w-[400px] animate-pulse bg-gray-100 rounded-xl border border-gray-100" />;
  }
  
  const hasPrograms = programs.length > 0;
  const isPrivileged = isOrgAdmin || isMasquerading;

  return (
    <div className="flex items-center gap-2">
      <Select
        value={activeProgram?.id || 'all'}
        onValueChange={(id) => setActiveProgram(id)}
        disabled={!hasPrograms && !isPrivileged}
      >
        <SelectTrigger 
          className="h-9 w-[220px] sm:w-[400px] px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 shadow-sm focus:ring-0 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-start text-left min-w-0 flex-1">
            <div className="flex-1 min-w-0 overflow-hidden leading-tight text-left">
              <span className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-tight truncate block">
                {!hasPrograms && !isPrivileged ? 'No Programs Assigned' : (activeProgram?.name || 'All Programs')}
              </span>
            </div>
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl shadow-2xl border-gray-100 max-w-[450px]">
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Switch View Context</span>
          </div>
          
          {isPrivileged && (
            <SelectItem value="all" className="text-xs font-black py-2 px-3 text-primary">
              ALL PROGRAMS OVERVIEW
            </SelectItem>
          )}

          {programs.map((program) => (
            <SelectItem 
              key={program.id} 
              value={program.id} 
              className="text-xs font-bold py-2 px-3"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className={program.status !== 'active' ? 'text-gray-500' : ''}>
                  {program.name}
                </span>
                {program.status !== 'active' && (
                  <span className="text-[8px] uppercase font-black text-gray-400 tracking-widest">
                    {program.status}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
