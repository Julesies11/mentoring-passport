import { useState, useMemo } from 'react';
import { useOrganisation } from '@/providers/organisation-provider';
import { Container } from '@/components/common/container';
import { Toolbar, ToolbarHeading, ToolbarActions } from '@/layouts/demo1/components/toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons/keenicons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  createProgram, 
  updateProgram, 
  duplicateProgram, 
  archiveProgram, 
  fetchPrograms,
  type Program 
} from '@/lib/api/programs';
import { fetchTaskLists, fetchAllPairTaskStatuses } from '@/lib/api/tasks';
import { fetchPairs } from '@/lib/api/pairs';
import { fetchOrgSupervisors, syncProgramSupervisors } from '@/lib/api/participants';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProgramDialog } from '../supervisor/components/program-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrganisationLogo } from '@/components/common/organisation-logo';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { useJobTitles } from '@/hooks/use-job-titles';

export function OrgAdminProgramsPage() {
  const { activeOrganisation, isLoading: isOrgLoadingContext } = useOrganisation();
  const queryClient = useQueryClient();
  const { jobTitles } = useJobTitles();

  // State
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | undefined>(undefined);
  const [isProcessingProgram, setIsProcessingProgram] = useState(false);
  
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [duplicatingProgram, setDuplicatingProgram] = useState<Program | null>(null);
  const [duplicateName, setDuplicateName] = useState('');

  // Data fetching
  const { data: programs = [], isLoading: isLoadingPrograms } = useQuery({
    queryKey: ['programs'],
    queryFn: () => fetchPrograms(),
  });

  const { data: taskLists = [] } = useQuery({
    queryKey: ['task-lists'],
    queryFn: () => fetchTaskLists(),
  });

  const { data: allSupervisors = [] } = useQuery({
    queryKey: ['org-supervisors'],
    queryFn: () => fetchOrgSupervisors(),
  });

  const { data: pairs = [] } = useQuery({
    queryKey: ['pairs'],
    queryFn: () => fetchPairs(),
  });

  const { data: taskStatuses = [] } = useQuery({
    queryKey: ['pair-tasks', 'all-statuses'],
    queryFn: () => fetchAllPairTaskStatuses(),
  });

  // Calculate aggregated data
  const programStats = useMemo(() => {
    const stats: Record<string, { 
      pairCount: number, 
      completion: number, 
      supervisors: Array<{ id: string, name: string, avatar_url: string | null, email: string, job_title_name: string | null }> 
    }> = {};
    
    programs.forEach(p => {
      const assignedSupervisors = allSupervisors
        .filter(s => s.assigned_program_ids.includes(p.id))
        .map(s => ({
          id: s.id,
          name: s.full_name || 'Unnamed Supervisor',
          avatar_url: s.avatar_url,
          email: s.email,
          job_title_name: jobTitles.find(jt => jt.id === s.job_title_id)?.title || 'Supervisor'
        }));

      const programPairs = pairs.filter(pair => pair.program_id === p.id);
      const pairIds = new Set(programPairs.map(pair => pair.id));
      const programTasks = taskStatuses.filter(ts => pairIds.has(ts.pair_id));
      
      const totalTasks = programTasks.length;
      const completedTasks = programTasks.filter(ts => ts.status === 'completed').length;
      
      stats[p.id] = {
        supervisors: assignedSupervisors,
        pairCount: programPairs.length,
        completion: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      };
    });
    
    return stats;
  }, [programs, allSupervisors, pairs, taskStatuses, jobTitles]);

  // Mutations
  const duplicateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string, name: string }) => duplicateProgram(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      setIsDuplicateDialogOpen(false);
      setDuplicatingProgram(null);
      setDuplicateName('');
      toast.success('Program duplicated');
    }
  });

  const archiveMutation = useMutation({
    mutationFn: archiveProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      toast.success('Program archived');
    }
  });

  const handleProgramSubmit = async (data: any) => {
    setIsProcessingProgram(true);
    try {
      const { supervisor_ids, ...programData } = data;
      let programId: string;

      if (editingProgram) {
        await updateProgram(editingProgram.id, programData);
        programId = editingProgram.id;
        toast.success('Program updated successfully');
      } else {
        const newProgram = await createProgram(programData);
        programId = newProgram.id;
        toast.success('Program created successfully');
      }

      // Sync supervisors
      if (supervisor_ids) {
        await syncProgramSupervisors(programId, supervisor_ids);
      }

      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['org-supervisors'] });
      setIsProgramDialogOpen(false);
    } catch (error) {
      console.error('Error handling program:', error);
      toast.error('Failed to save program');
    } finally {
      setIsProcessingProgram(false);
    }
  };

  const sortedPrograms = useMemo(() => {
    return [...programs].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [programs]);

  if (isOrgLoadingContext) {
    return (
      <Container className="py-20 text-center">
        <KeenIcon icon="loading" className="animate-spin text-3xl text-primary mb-2" />
        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Loading organisation data...</p>
      </Container>
    );
  }

  return (
    <>
      <Container>
        <Toolbar>
          <div className="flex items-center gap-4">
            <OrganisationLogo 
              orgId={activeOrganisation?.id || ''} 
              logoPath={activeOrganisation?.logo_url} 
              name={activeOrganisation?.name} 
              size="md"
              className="rounded-lg shadow-sm"
            />
            <ToolbarHeading 
              title={activeOrganisation?.name || "Mentoring Programs"} 
              description="Manage and monitor all mentoring initiatives within your organisation" 
            />
          </div>
          <ToolbarActions>
            <div className="flex items-center gap-2">
              <Button 
                variant="primary"
                size="sm" 
                className="rounded-xl h-10 font-bold"
                onClick={() => { setEditingProgram(undefined); setIsProgramDialogOpen(true); }}
              >
                <KeenIcon icon="plus" />
                New Program
              </Button>
            </div>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <Card className="border-0 sm:border overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest min-w-[200px]">Program Details</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Task Template</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest min-w-[180px]">Supervisors</th>
                    <th className="text-center py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">PAIRS</th>
                    <th className="text-center py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Overall Progress</th>
                    <th className="text-right py-4 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoadingPrograms ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-muted-foreground">
                        <KeenIcon icon="loading" className="animate-spin text-2xl mb-2" />
                        <p className="font-medium">Loading programs...</p>
                      </td>
                    </tr>
                  ) : sortedPrograms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <KeenIcon icon="coffee" className="text-4xl text-gray-200" />
                          <p className="text-sm font-bold text-gray-400 italic">No mentoring programs have been created yet.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedPrograms.map((program) => {
                      const template = taskLists.find(l => l.id === program.task_list_id);
                      const stats = programStats[program.id] || { pairCount: 0, completion: 0, supervisors: [] };

                      return (
                        <tr key={program.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="py-5 px-6">
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-gray-900 truncate mb-1">
                                {program.name}
                              </span>
                              <Badge variant="outline" className={cn(
                                "text-[9px] font-black uppercase border-none h-4 w-fit rounded-md px-1.5",
                                program.status === 'active' ? "bg-green-100 text-green-700" : 
                                program.status === 'archived' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                              )}>
                                {program.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-5 px-6">
                            <span className="text-xs font-medium text-gray-600">
                              {template?.name || '-'}
                            </span>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex flex-col gap-3">
                              {stats.supervisors.length > 0 ? (
                                stats.supervisors.map((s) => (
                                  <div key={s.id} className="flex items-center gap-2">
                                    <ProfileAvatar 
                                      userId={s.id} 
                                      currentAvatar={s.avatar_url} 
                                      userName={s.name} 
                                      size="xs" 
                                    />
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[11px] font-bold text-gray-800 leading-tight truncate">
                                        {s.name}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-none truncate">
                                        {s.job_title_name || 'Supervisor'}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          </td>
                          <td className="py-5 px-6 text-center">
                            <div className="flex flex-col items-center">
                              {stats.pairCount === 0 ? (
                                <Badge 
                                  variant="outline" 
                                  className="bg-danger-light text-danger border-danger/10 font-bold px-2.5 h-6 rounded-lg"
                                >
                                  0
                                </Badge>
                              ) : (
                                <span className="text-sm font-bold text-gray-900">{stats.pairCount}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-5 px-6 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="w-full max-w-[80px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-500",
                                    stats.completion === 100 ? "bg-success" : "bg-primary"
                                  )} 
                                  style={{ width: `${stats.completion}%` }} 
                                />
                              </div>
                              <span className="text-[10px] font-bold text-gray-900">{stats.completion}%</span>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                mode="icon" 
                                size="sm" 
                                className="size-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors"
                                onClick={() => { setEditingProgram(program); setIsProgramDialogOpen(true); }}
                                title="Edit Program"
                              >
                                <KeenIcon icon="pencil" className="text-base" />
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                mode="icon" 
                                size="sm" 
                                className="size-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors"
                                onClick={() => {
                                  setDuplicatingProgram(program);
                                  setDuplicateName(`${program.name} (Copy)`);
                                  setIsDuplicateDialogOpen(true);
                                }}
                                title="Duplicate Program"
                              >
                                <KeenIcon icon="copy" className="text-base" />
                              </Button>

                              <Button 
                                variant="ghost" 
                                mode="icon" 
                                size="sm" 
                                className="size-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-danger transition-colors"
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to archive this program? This will hide it from active dashboards.')) {
                                    archiveMutation.mutate(program.id);
                                  }
                                }}
                                title="Archive Program"
                                disabled={program.status === 'archived'}
                              >
                                <KeenIcon icon="trash" className="text-base" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {sortedPrograms.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                <span className="text-xs text-muted-foreground font-medium">
                  Showing 1 to {Math.min(25, sortedPrograms.length)} of {sortedPrograms.length} programs
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled className="h-8 rounded-lg opacity-50">Previous</Button>
                  <Button variant="outline" size="sm" disabled className="h-8 rounded-lg opacity-50">Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Container>

      <ProgramDialog 
        open={isProgramDialogOpen}
        onOpenChange={setIsProgramDialogOpen}
        onSubmit={handleProgramSubmit}
        program={editingProgram}
        isLoading={isProcessingProgram}
        allSupervisors={allSupervisors}
      />

      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Duplicate Program</DialogTitle>
            <DialogDescription>
              Create a new program based on "{duplicatingProgram?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dup-name">New Program Name</Label>
              <Input
                id="dup-name"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDuplicateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => duplicateMutation.mutate({ id: duplicatingProgram!.id, name: duplicateName })}
              disabled={!duplicateName.trim() || duplicateMutation.isPending}
            >
              {duplicateMutation.isPending ? 'Duplicating...' : 'Duplicate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
