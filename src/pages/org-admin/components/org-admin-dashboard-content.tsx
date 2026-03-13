import { useMemo, useState } from 'react';
import { useOrganisation } from '@/providers/organisation-provider';
import { usePairs } from '@/hooks/use-pairs';
import { useParticipants, useOrgSupervisors } from '@/hooks/use-participants';
import { useAllPairTaskStatuses, useTaskLists } from '@/hooks/use-tasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { isAfter, parseISO } from 'date-fns';
import { calculatePairProgress } from '@/lib/utils/progress';
import { cn } from '@/lib/utils';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { OrganisationLogo } from '@/components/common/organisation-logo';
import { EditOrganisationDialog } from '@/components/common/edit-organisation-dialog';

export function OrgAdminDashboardContent() {
  const navigate = useNavigate();
  const { activeOrganisation, programs = [] } = useOrganisation();
  const { pairs = [] } = usePairs();
  const { participants = [] } = useParticipants();
  const { supervisors = [] } = useOrgSupervisors();
  const { data: allStatuses = [] } = useAllPairTaskStatuses();
  const { data: taskLists = [] } = useTaskLists();
  const [isEditOrgOpen, setIsEditOrgOpen] = useState(false);

  // 1. Executive Summary Metrics
  const stats = useMemo(() => {
    const activePrograms = programs.filter(p => p.status === 'active');
    const activePairs = pairs.filter(p => p.status === 'active');
    
    // Average completion percentage across all active pairs in the org
    const activePairProgress = activePairs.map(p => calculatePairProgress(p.id, allStatuses).percentage);
    const avgProgress = activePairProgress.length > 0 
      ? Math.round(activePairProgress.reduce((a, b) => a + b, 0) / activePairProgress.length) 
      : 0;

    return {
      totalPrograms: programs.length,
      activePrograms: activePrograms.length,
      activePairs: activePairs.length,
      avgProgress,
      totalParticipants: participants.length,
      totalSupervisors: supervisors.length,
      taskTemplates: taskLists.length
    };
  }, [programs, pairs, participants, supervisors, allStatuses, taskLists]);

  // 2. Program Performance Overview
  const programPerformance = useMemo(() => {
    return programs
      .filter(p => p.status === 'active')
      .map(program => {
        const programPairs = pairs.filter(pair => pair.program_id === program.id);
        const activeProgramPairs = programPairs.filter(pair => pair.status === 'active');
        
        const pairProgresses = activeProgramPairs.map(p => calculatePairProgress(p.id, allStatuses).percentage);
        const avgProgress = pairProgresses.length > 0 
          ? Math.round(pairProgresses.reduce((a, b) => a + b, 0) / pairProgresses.length) 
          : 0;

        const isOverdue = program.end_date ? isAfter(new Date(), parseISO(program.end_date)) : false;

        return {
          id: program.id,
          name: program.name,
          pairCount: programPairs.length,
          activePairCount: activeProgramPairs.length,
          avgProgress,
          isOverdue
        };
      })
      .sort((a, b) => b.activePairCount - a.activePairCount)
      .slice(0, 5);
  }, [programs, pairs, allStatuses]);

  // 3. Supervisor Workload
  const supervisorWorkload = useMemo(() => {
    return supervisors
      .map(sv => {
        const managedPairs = pairs.filter(p => 
          p.program_id && sv.assigned_program_ids?.includes(p.program_id)
        );
        return {
          ...sv,
          managedPrograms: sv.assigned_program_ids?.length || 0,
          managedPairs: managedPairs.length,
          activePairs: managedPairs.filter(p => p.status === 'active').length
        };
      })
      .sort((a, b) => b.activePairs - a.activePairs)
      .slice(0, 5);
  }, [supervisors, pairs]);

  return (
    <div className="grid gap-5 lg:gap-7.5">
      {/* Organisation Branding Header */}
      <Card className="border border-gray-200 shadow-none overflow-hidden rounded-[2rem]">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6 bg-gray-50/50">
            <div className="flex items-center gap-6">
              <div 
                className="group relative cursor-pointer active:scale-95 transition-transform shrink-0"
                onClick={() => setIsEditOrgOpen(true)}
              >
                <OrganisationLogo 
                  orgId={activeOrganisation?.id || ''} 
                  logoPath={activeOrganisation?.logo_url} 
                  name={activeOrganisation?.name} 
                  size="lg"
                  className="rounded-2xl border-2 border-white shadow-sm group-hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <KeenIcon icon="camera" className="text-white text-xl" />
                </div>
              </div>
              <div className="space-y-1 min-w-0">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter truncate">
                  {activeOrganisation?.name}
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="primary" appearance="light" size="xs" className="uppercase font-black tracking-widest">
                    Active Tenant
                  </Badge>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">
                    ID: {activeOrganisation?.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditOrgOpen(true)}
                className="rounded-xl font-bold text-xs h-10 px-5 gap-2"
              >
                <KeenIcon icon="pencil" className="text-base" />
                Edit Organisation
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeOrganisation && (
        <EditOrganisationDialog
          open={isEditOrgOpen}
          onOpenChange={setIsEditOrgOpen}
          organisation={{
            id: activeOrganisation.id,
            name: activeOrganisation.name,
            logo_url: activeOrganisation.logo_url
          }}
        />
      )}

      {/* 1. Governance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7.5">
        <Card className="border-none shadow-sm bg-primary text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                <KeenIcon icon="layers" className="text-xl text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-none font-bold">Active</Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-black">{stats.activePrograms} / {stats.totalPrograms}</h3>
              <p className="text-xs font-medium text-white/70 uppercase tracking-widest text-wrap">Mentoring Programs</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-success text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                <KeenIcon icon="users" className="text-xl text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-black">{stats.activePairs}</h3>
              <p className="text-xs font-medium text-white/70 uppercase tracking-widest">Active Pairings</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-info text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                <KeenIcon icon="chart-line-star" className="text-xl text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-black">{stats.avgProgress}%</h3>
              <p className="text-xs font-medium text-white/70 uppercase tracking-widest">Hospital-wide Pulse</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-dark text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                <KeenIcon icon="check-squared" className="text-xl text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-black">{stats.taskTemplates}</h3>
              <p className="text-xs font-medium text-white/70 uppercase tracking-widest">Curriculum Templates</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7.5 items-start">
        {/* 2. Program Performance Card */}
        <Card className="lg:col-span-7 shadow-none border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Program Engagement</CardTitle>
              <CardDescription>Performance oversight across active cohorts</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/org-admin/programs')} className="rounded-xl font-bold text-xs">
              Manage All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left py-3 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Program Name</th>
                    <th className="text-center py-3 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Pairs</th>
                    <th className="text-left py-3 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest w-[150px]">Avg Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {programPerformance.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{p.name}</span>
                          {p.isOverdue && (
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Closing Soon</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-gray-700">
                        {p.activePairCount}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[9px] font-black uppercase text-gray-400">
                            <span>{p.avgProgress}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all duration-500",
                                p.avgProgress > 75 ? "bg-success" : p.avgProgress > 40 ? "bg-primary" : "bg-warning"
                              )}
                              style={{ width: `${p.avgProgress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {programPerformance.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-gray-400 italic">No active programs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 3. Supervisor Capacity */}
        <Card className="lg:col-span-5 shadow-none border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Supervisor Workload</CardTitle>
              <CardDescription>Capacity & assignment tracking</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/org-admin/supervisors')} className="rounded-xl font-bold text-xs">
              Manage
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {supervisorWorkload.map((sv) => (
                <div key={sv.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <ProfileAvatar 
                      userId={sv.id} 
                      currentAvatar={sv.avatar_url} 
                      userName={sv.full_name} 
                      size="sm" 
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-gray-900 truncate">{sv.full_name}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{sv.managedPrograms} Programs</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={cn(
                      "text-xs font-black",
                      sv.activePairs > 10 ? "text-danger" : sv.activePairs > 5 ? "text-primary" : "text-gray-700"
                    )}>
                      {sv.activePairs} Active Pairs
                    </span>
                    {sv.activePairs > 10 && (
                      <span className="text-[8px] font-black text-danger uppercase tracking-tighter">High Workload</span>
                    )}
                  </div>
                </div>
              ))}
              {supervisorWorkload.length === 0 && (
                <div className="py-12 text-center text-gray-400 italic px-6">No supervisors identified yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Strategic Governance Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="hover:border-primary transition-colors cursor-pointer border border-gray-200" onClick={() => navigate('/org-admin/programs')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <KeenIcon icon="rocket" className="text-2xl text-primary" />
            </div>
            <div>
              <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm">Launch Cohort</h4>
              <p className="text-xs text-muted-foreground">Create a new mentoring program</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-success transition-colors cursor-pointer border border-gray-200" onClick={() => navigate('/org-admin/task-templates')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-success/10 flex items-center justify-center shrink-0">
              <KeenIcon icon="book-open" className="text-2xl text-success" />
            </div>
            <div>
              <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm">Standardize Curriculum</h4>
              <p className="text-xs text-muted-foreground">Update hospital-wide task lists</p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-info transition-colors cursor-pointer border border-gray-200" onClick={() => navigate('/org-admin/supervisors')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-info/10 flex items-center justify-center shrink-0">
              <KeenIcon icon="user-tick" className="text-2xl text-info" />
            </div>
            <div>
              <h4 className="font-black text-gray-900 uppercase tracking-tight text-sm">Manage Pool</h4>
              <p className="text-xs text-muted-foreground">Review supervisor assignments</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
