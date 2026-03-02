import { useState, useEffect, useMemo } from 'react';
import { useAllParticipants } from '@/hooks/use-participants';
import { usePairs } from '@/hooks/use-pairs';
import { usePendingEvidence } from '@/hooks/use-evidence';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import { fetchPairTasks } from '@/lib/api/tasks';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { cn } from '@/lib/utils';

export function SupervisorDashboardContent() {
  const navigate = useNavigate();
  const { data: participants = [] } = useAllParticipants();
  const { pairs = [] } = usePairs();
  const { evidence: pendingEvidenceList = [] } = usePendingEvidence();

  const [pairProgress, setPairProgress] = useState<Record<string, number>>({});

  // Fetch detailed progress for all active pairs
  useEffect(() => {
    const fetchProgress = async () => {
      if (!pairs || pairs.length === 0) {
        return;
      }

      const progressMap: Record<string, number> = {};
      try {
        await Promise.all(pairs.map(async (pair) => {
          if (pair.status === 'active') {
            const tasks = await fetchPairTasks(pair.id);
            const completed = tasks.filter((t: any) => t.status === 'completed').length;
            const total = tasks.length;
            progressMap[pair.id] = total > 0 ? Math.round((completed / total) * 100) : 0;
          }
        }));
        setPairProgress(progressMap);
      } catch (error) {
        console.error('Error fetching pair progress:', error);
      }
    };

    fetchProgress();
  }, [pairs]);

  // Statistics
  const stats = useMemo(() => {
    // 1. Active Relationships: Pairs with status 'active'
    const active = pairs.filter(p => p.status === 'active').length;
    
    // 2. Pending Reviews: Number of pending evidence items
    const pending = pendingEvidenceList.length;
    
    // 3. Unpaired Members: Active participants with role 'program-member' not in an active pair
    const activeParticipants = participants.filter(p => p.status === 'active');
    const unpaired = activeParticipants.filter(p => 
      p.role === 'program-member' && 
      !pairs.some(pair => (pair.mentor_id === p.id || pair.mentee_id === p.id) && pair.status === 'active')
    ).length;
    
    // 4. Program Pulse: Average completion percentage of all active relationships
    const activePairProgress = pairs
      .filter(p => p.status === 'active' && pairProgress[p.id] !== undefined)
      .map(p => pairProgress[p.id]);
      
    const avgProgress = activePairProgress.length > 0 
      ? Math.round(activePairProgress.reduce((a, b) => a + b, 0) / activePairProgress.length) 
      : 0;

    return { active, pending, unpaired, avgProgress };
  }, [pairs, pendingEvidenceList, participants, pairProgress]);

  // Stale Pairings (No activity in 14 days)
  const stalePairings = useMemo(() => {
    return pairs
      .filter(p => p.status === 'active')
      .filter(p => differenceInDays(new Date(), new Date(p.updated_at)) > 14)
      .slice(0, 5);
  }, [pairs]);

  return (
    <div className="grid gap-5 lg:gap-7.5">
      {/* 1. Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7.5">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7.5 items-start">
        {/* 2. Priority Review Queue */}
        <Card className="lg:col-span-8 shadow-none border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">Priority Review Queue</CardTitle>
              <CardDescription>Latest evidence submissions awaiting your approval</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/supervisor/evidence-review')} className="rounded-xl font-bold text-xs h-9">
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {pendingEvidenceList.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {pendingEvidenceList.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 px-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex -space-x-2 shrink-0">
                        <div className="size-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm">
                          {item.pair?.mentor?.id && (
                            <ProfileAvatar userId={item.pair.mentor.id} currentAvatar={item.pair.mentor.avatar_url} userName={item.pair.mentor.full_name || undefined} size="sm" />
                          )}
                        </div>
                        <div className="size-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm">
                          {item.pair?.mentee?.id && (
                            <ProfileAvatar userId={item.pair.mentee.id} currentAvatar={item.pair.mentee.avatar_url} userName={item.pair.mentee.full_name || undefined} size="sm" />
                          )}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {item.task?.name || 'Task Evidence'}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5 uppercase font-bold">
                          <span className="text-primary">{item.pair?.mentor?.full_name}</span>
                          <KeenIcon icon="dots" className="text-[8px]" />
                          <span className="text-success">{item.pair?.mentee?.full_name}</span>
                          <span className="size-1 rounded-full bg-gray-300 ml-1"></span>
                          <span>{format(new Date(item.created_at), 'MMM d')}</span>
                        </p>
                      </div>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => navigate('/supervisor/evidence-review')} className="rounded-lg h-8 px-4 font-bold text-[11px]">
                      Quick Review
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
        <Card className="lg:col-span-4 shadow-none border-gray-200">
          <CardHeader className="px-6 py-4 border-b border-gray-100">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <KeenIcon icon="notification-status" className="text-warning text-xl" />
              Stale Pairings
            </CardTitle>
            <CardDescription>Relationships with no activity for 14+ days</CardDescription>
          </CardHeader>
          <CardContent className="p-4 px-6">
            {stalePairings.length > 0 ? (
              <div className="space-y-3">
                {stalePairings.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl border border-warning/20 bg-warning/[0.02] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        <div className="size-7 rounded-full border-2 border-white bg-gray-100 overflow-hidden">
                          {p.mentor?.id && (
                            <ProfileAvatar userId={p.mentor.id} currentAvatar={p.mentor.avatar_url} userName={p.mentor.full_name || undefined} size="sm" />
                          )}
                        </div>
                        <div className="size-7 rounded-full border-2 border-white bg-gray-100 overflow-hidden">
                          {p.mentee?.id && (
                            <ProfileAvatar userId={p.mentee.id} currentAvatar={p.mentee.avatar_url} userName={p.mentee.full_name || undefined} size="sm" />
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-warning uppercase">
                        {differenceInDays(new Date(), new Date(p.updated_at))} Days Inactive
                      </span>
                    </div>
                    <p className="text-xs font-bold text-gray-800 leading-tight">
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
      <Card className="shadow-none border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <CardTitle className="text-lg font-bold text-gray-900">Relationship Progress Tracker</CardTitle>
            <CardDescription>Monitor program health across all mentoring pairs</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/supervisor/pairs')} className="rounded-xl font-bold text-xs h-9">
              Manage Pairs
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Mentor / Mentee</th>
                  <th className="text-left py-3 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Progress</th>
                  <th className="text-left py-3 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Last Update</th>
                  <th className="text-right py-3 px-6 text-[10px] font-black uppercase text-gray-400 tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pairs.filter(p => p.status === 'active').slice(0, 8).map((p) => (
                  <tr 
                    key={p.id} 
                    className="hover:bg-primary/[0.02] transition-colors text-sm cursor-pointer group"
                    onClick={() => navigate(`/supervisor/checklist?pair=${p.id}`)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2 shrink-0">
                          <div className="size-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm group-hover:border-primary/20 transition-all">
                            {p.mentor?.id && (
                              <ProfileAvatar userId={p.mentor.id} currentAvatar={p.mentor.avatar_url} userName={p.mentor.full_name || undefined} size="sm" />
                            )}
                          </div>
                          <div className="size-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm group-hover:border-primary/20 transition-all">
                            {p.mentee?.id && (
                              <ProfileAvatar userId={p.mentee.id} currentAvatar={p.mentee.avatar_url} userName={p.mentee.full_name || undefined} size="sm" />
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
                            <span className="text-primary">{p.mentor?.full_name}</span> & <span className="text-success">{p.mentee?.full_name}</span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Active Relationship</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 min-w-[200px]">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                          <span className="text-primary">{pairProgress[p.id] || 0}%</span>
                        </div>
                        <Progress value={pairProgress[p.id] || 0} className="h-1.5" />
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-600 font-medium">
                      {format(new Date(p.updated_at), 'MMM d, yyyy')}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Badge variant="outline" className="bg-success-light text-success border-none text-[9px] uppercase font-black px-2">Active</Badge>
                    </td>
                  </tr>
                ))}
                {pairs.filter(p => p.status === 'active').length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400 italic">
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
