import { useMemo } from 'react';
import { useAllParticipants } from '@/hooks/use-participants';
import { usePairs } from '@/hooks/use-pairs';
import { usePendingEvidence } from '@/hooks/use-evidence';
import { useAllPairTaskStatuses } from '@/hooks/use-tasks';
import { useOrganisation } from '@/providers/organisation-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { calculatePairProgress } from '@/lib/utils/progress';

export function SupervisorDashboardContent() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { activeProgram, programs, isLoading: isContextLoading } = useOrganisation();
  const programId = activeProgram?.id;

  // Data fetching scoped to the active program
  // Note: useAllParticipants takes programId but we want ALL org members for the "Unpaired" count
  // however, useParticipants hook in Phase 1 was updated to take programId.
  // To keep "Unpaired" as Org-wide, we'll fetch all participants without programId
  const { data: allParticipants = [] } = useAllParticipants(); 
  const { pairs = [] } = usePairs(); // usePairs uses context activeProgram automatically
  const { evidence: pendingEvidenceList = [] } = usePendingEvidence(); // usePendingEvidence uses context activeProgram automatically
  const { data: allStatuses = [] } = useAllPairTaskStatuses(programId);

  // Statistics
  const stats = useMemo(() => {
    // If we have programs but no active one is selected yet (loading), or if there are NO programs
    if (programs.length > 0 && !activeProgram) return { active: 0, pending: 0, unpaired: 0, avgProgress: 0 };
    
    // 1. Active Relationships: Pairs with status 'active' in the current program context
    const activePairs = pairs.filter(p => p.status === 'active');
    const active = activePairs.length;
    
    // 2. Pending Reviews: Number of pending evidence items in current program
    const pending = pendingEvidenceList.length;
    
    // 3. Unpaired Members: ALL active participants in the hospital with role 'program-member' not in an active pair
    // (As requested: Supervisors see all Org participants for potential pairing)
    const activeParticipants = allParticipants.filter(p => p.status === 'active');
    const unpaired = activeParticipants.filter(p => 
      p.role === 'program-member' && 
      !pairs.some(pair => (pair.mentor_id === p.id || pair.mentee_id === p.id) && pair.status === 'active')
    ).length;
    
    // 4. Program Pulse: Average completion percentage of all active relationships
    const activePairProgress = activePairs.map(p => calculatePairProgress(p.id, allStatuses).percentage);
      
    const avgProgress = activePairProgress.length > 0 
      ? Math.round(activePairProgress.reduce((a, b) => a + b, 0) / activePairProgress.length) 
      : 0;

    return { active, pending, unpaired, avgProgress };
  }, [activeProgram, programs, pairs, pendingEvidenceList, allParticipants, allStatuses]);

  // Handle No Programs Assigned state
  if (!isContextLoading && programs.length === 0) {
    return (
      <Card className="border-dashed border-2 border-gray-200 shadow-none">
        <CardContent className="py-20 flex flex-col items-center justify-center text-center px-6">
          <div className="size-20 rounded-full bg-gray-50 flex items-center justify-center mb-6 text-gray-200">
            <KeenIcon icon=" some-files-icon" className="text-5xl" />
          </div>
          <h3 className="text-xl font-black text-gray-900">No Programs Assigned</h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-2 mb-8">
            You haven't been assigned to any mentoring programs yet. Please contact your Organisation Administrator to be assigned to a specialty or ward.
          </p>
          <Button variant="primary" onClick={() => navigate('/profile/edit')} className="rounded-xl font-bold">
            View My Profile
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Stale Pairings (No activity in 14 days)
  const stalePairings = useMemo(() => {
    return pairs
      .filter(p => p.status === 'active')
      .filter(p => differenceInDays(new Date(), new Date(p.updated_at)) > 14)
      .slice(0, 5);
  }, [pairs]);

  // Relationship Progress Tracker (Top 10, least progress first)
  const sortedPairsByProgress = useMemo(() => {
    return pairs
      .filter(p => p.status === 'active')
      .map(p => ({
        ...p,
        progress: calculatePairProgress(p.id, allStatuses)
      }))
      .sort((a, b) => a.progress.percentage - b.progress.percentage)
      .slice(0, 10);
  }, [pairs, allStatuses]);

  return (
    <div className="grid gap-2 sm:gap-5 lg:gap-7.5">
      {/* 1. Executive Summary */}
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7.5" data-testid="executive-summary">
        <Card className="border-none shadow-sm bg-primary text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                <KeenIcon icon="users" className="text-xl text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-none font-bold">Active</Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-black">{stats.active}</h3>
              <p className="text-xs font-medium text-white/70 uppercase tracking-widest">Active Relationships</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm relative overflow-hidden bg-white">
          {stats.pending > 0 && <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-600"></div>}
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("size-10 rounded-lg flex items-center justify-center", stats.pending > 0 ? "bg-red-50" : "bg-gray-50")}>
                <KeenIcon icon="notification-on" className={cn("text-xl", stats.pending > 0 ? "text-red-600" : "text-gray-400")} />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-black text-black">{stats.pending}</h3>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Pending Reviews</p>
            </div>
          </CardContent>
        </Card>


        <Card className="border-none shadow-sm bg-success text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                <KeenIcon icon="chart-line-star" className="text-xl text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-black">{stats.avgProgress}%</h3>
              <p className="text-xs font-medium text-white/70 uppercase tracking-widest">Program Pulse (Avg)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-info text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
                <KeenIcon icon="user-tick" className="text-xl text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-black">{stats.unpaired}</h3>
              <p className="text-xs font-medium text-white/70 uppercase tracking-widest">Unpaired Members</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-5 lg:gap-7.5 items-start">
        {/* 2. Priority Review Queue */}
        <Card className="lg:col-span-8 shadow-none border-0 sm:border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-100 min-h-0">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-gray-900">Priority Review Queue</CardTitle>
              <CardDescription className="hidden sm:block">Latest evidence submissions awaiting your approval</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/supervisor/evidence-review')} className="rounded-xl font-bold text-[10px] sm:text-xs h-8 sm:h-9">
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {pendingEvidenceList.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {pendingEvidenceList.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 px-3 sm:p-4 sm:px-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                      <div className="flex -space-x-2 shrink-0">
                        <div className="size-7 sm:size-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm">
                          {item.pair?.mentor?.id && (
                            <ProfileAvatar userId={item.pair.mentor.id} currentAvatar={item.pair.mentor.avatar_url} userName={item.pair.mentor.full_name || undefined} size="sm" />
                          )}
                        </div>
                        <div className="size-7 sm:size-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm">
                          {item.pair?.mentee?.id && (
                            <ProfileAvatar userId={item.pair.mentee.id} currentAvatar={item.pair.mentee.avatar_url} userName={item.pair.mentee.full_name || undefined} size="sm" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                            {item.task?.name || 'Task Evidence'}
                          </p>
                          <span className="text-[10px] text-gray-400 font-bold uppercase shrink-0">
                            {format(new Date(item.created_at), 'MMM d')}
                          </span>
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground flex flex-wrap items-center gap-1 sm:gap-1.5 mt-0.5 uppercase font-bold">
                          <span className="text-primary">{item.pair?.mentor?.full_name}</span>
                          <KeenIcon icon="dots" className="text-[6px] sm:text-[8px] shrink-0" />
                          <span className="text-success">{item.pair?.mentee?.full_name}</span>
                        </p>
                      </div>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => navigate('/supervisor/evidence-review')} className="rounded-lg h-7 sm:h-8 px-2 sm:px-4 font-bold text-[10px] sm:text-[11px] shrink-0 ml-4">
                      {isMobile ? 'Review' : 'Quick Review'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                <div className="size-16 rounded-full bg-gray-50 flex items-center justify-center mb-4 text-gray-200">
                  <KeenIcon icon="check-circle" className="text-4xl" />
                </div>
                <h4 className="text-base font-bold text-gray-900">All caught up!</h4>
                <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                  There are no pending evidence submissions requiring your attention right now.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Stale Pairings Alerts */}
        <Card className="lg:col-span-4 shadow-none border-0 sm:border border-gray-200">
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-100 min-h-0">
            <CardTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <KeenIcon icon="notification-status" className="text-warning text-lg sm:text-xl" />
              Stale Pairings
            </CardTitle>
            <CardDescription className="hidden sm:block">Relationships with no activity for 14+ days</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 px-3 sm:px-6">
            {stalePairings.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {stalePairings.map((p) => (
                  <div key={p.id} className="p-2 sm:p-3 rounded-xl border border-warning/20 bg-warning/[0.02] space-y-1 sm:space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        <div className="size-6 sm:size-7 rounded-full border-2 border-white bg-gray-100 overflow-hidden">
                          {p.mentor?.id && (
                            <ProfileAvatar userId={p.mentor.id} currentAvatar={p.mentor.avatar_url} userName={p.mentor.full_name || undefined} size="sm" />
                          )}
                        </div>
                        <div className="size-6 sm:size-7 rounded-full border-2 border-white bg-gray-100 overflow-hidden">
                          {p.mentee?.id && (
                            <ProfileAvatar userId={p.mentee.id} currentAvatar={p.mentee.avatar_url} userName={p.mentee.full_name || undefined} size="sm" />
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-black text-warning uppercase">
                        {differenceInDays(new Date(), new Date(p.updated_at))} Days Inactive
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs font-bold text-gray-800 leading-tight truncate">
                      {p.mentor?.full_name} & {p.mentee?.full_name}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <KeenIcon icon="shield-tick" className="text-success text-3xl mb-2 opacity-20" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Everything Healthy</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Relationship Progress Tracker */}
      <Card className="shadow-none border-0 sm:border border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-100 min-h-0">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-gray-900">Program Health Tracker</CardTitle>
            <CardDescription className="hidden sm:block">Identifying relationships that may require additional support or intervention</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/supervisor/pairs')} className="rounded-xl font-bold text-[10px] sm:text-xs h-8 sm:h-9">
              Manage Pairs
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto overflow-y-hidden">
            <table className="table-fixed md:table-auto w-full min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="w-[55%] md:w-auto text-left py-2 sm:py-3 px-3 sm:px-6 text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-widest">Mentor / Mentee</th>
                  <th className="w-[25%] md:w-auto text-left py-2 sm:py-3 px-3 sm:px-6 text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-widest">Progress</th>
                  <th className="w-[20%] md:w-auto text-center py-2 sm:py-3 px-3 sm:px-6 text-[9px] sm:text-[10px] font-black uppercase text-gray-400 tracking-widest">Last Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedPairsByProgress.map((p) => {
                  const progress = p.progress;
                  return (
                  <tr 
                    key={p.id} 
                    className="hover:bg-primary/[0.02] transition-colors text-sm cursor-pointer group"
                    onClick={() => navigate(`/supervisor/checklist?pair=${p.id}`)}
                  >
                    <td className="py-3 sm:py-4 px-3 sm:px-6 overflow-hidden">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="flex -space-x-2 shrink-0">
                          <div className="size-7 sm:size-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm group-hover:border-primary/20 transition-all">
                            {p.mentor?.id && (
                              <ProfileAvatar userId={p.mentor.id} currentAvatar={p.mentor.avatar_url} userName={p.mentor.full_name || undefined} size="sm" />
                            )}
                          </div>
                          <div className="size-7 sm:size-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm group-hover:border-primary/20 transition-all">
                            {p.mentee?.id && (
                              <ProfileAvatar userId={p.mentee.id} currentAvatar={p.mentee.avatar_url} userName={p.mentee.full_name || undefined} size="sm" />
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-gray-900 group-hover:text-primary transition-colors text-xs sm:text-sm leading-tight break-words">
                            <span className="text-primary">{p.mentor?.full_name}</span> & <span className="text-success">{p.mentee?.full_name}</span>
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-tighter truncate md:whitespace-normal">
                            {p.mentor?.job_title || 'N/A'} • {p.mentee?.job_title || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-6 min-w-0">
                      <div className="flex flex-col gap-1 min-w-[80px] lg:min-w-[120px]">
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase text-gray-400">
                          <span>{progress.formatted}</span>
                          <span>{progress.percentage}%</span>
                        </div>
                        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500" 
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 sm:py-4 px-3 sm:px-6 text-[10px] sm:text-xs text-gray-600 font-medium text-center">
                      {format(new Date(p.updated_at), 'MMM d')}
                    </td>
                  </tr>
                )})}
                {pairs.filter(p => p.status === 'active').length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-gray-400 italic">
                      No active relationships found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
