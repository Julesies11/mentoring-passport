import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { useTasks } from '@/hooks/use-tasks';
import { useAllMeetings } from '@/hooks/use-meetings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { usePairing } from '@/providers/pairing-provider';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function MentorDashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pairings = [], isLoading: pairingsLoading, setSelectedPairingId } = usePairing();
  const { fetchPairTasks } = useTasks();
  const { meetings = [] } = useAllMeetings();

  const [pairStats, setPairStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active pairings for this mentor
  const activePairings = useMemo(() => 
    pairings.filter(p => p.mentor_id === user?.id && p.status === 'active'),
    [pairings, user?.id]
  );

  useEffect(() => {
    const fetchAllData = async () => {
      if (pairings.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const stats = await Promise.all(pairings.map(async (pair) => {
          const tasks = await fetchPairTasks(pair.id);
          const pairMeetings = meetings.filter(m => m.pair_id === pair.id);
          
          const sortedTasks = [...tasks].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          
          const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
          const awaitingReviewTasks = tasks.filter((t: any) => t.status === 'awaiting_review').length;
          const totalTasks = tasks.length;
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          const upcomingPairMeetings = pairMeetings
            .filter(m => m.status === 'upcoming' && new Date(m.date_time) > new Date())
            .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime());

          // Logic for "What to do next" - Prioritize items needing mentor attention
          const nextTask = sortedTasks.find((t: any) => t.status === 'revision_required') || 
                           sortedTasks.find((t: any) => t.status === 'not_submitted');
          
          // Recent Activity
          const recentActivity = sortedTasks
            .filter((t: any) => t.status === 'completed' || t.status === 'awaiting_review' || t.status === 'revision_required')
            .sort((a, b) => {
                const dateA = new Date(a.updated_at || a.created_at).getTime();
                const dateB = new Date(b.updated_at || b.created_at).getTime();
                return dateB - dateA;
            })
            .slice(0, 2);

          return {
            pair,
            completedTasks,
            awaitingReviewTasks,
            totalTasks,
            progress,
            upcomingPairMeetings,
            nextTask,
            recentActivity
          };
        }));
        
        setPairStats(stats);
      } catch (error) {
        console.error('Error fetching mentor dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [pairings, fetchPairTasks, meetings]);

  if (loading || pairingsLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  const goToTasks = (pairId: string, taskId?: string) => {
    setSelectedPairingId(pairId);
    navigate(`/program-member/tasks?pair=${pairId}${taskId ? `&taskId=${taskId}` : ''}`);
  };

  const goToMeetings = (pairId: string, openDialog = false) => {
    setSelectedPairingId(pairId);
    navigate(`/program-member/meetings${openDialog ? '?create=true' : ''}`);
  };

  const renderRelationshipSection = (stat: any) => {
    const mentee = stat.pair.mentee;

    return (
      <div key={stat.pair.id} className="mb-12 last:mb-0">
        <Card className="border-primary/10 bg-primary/[0.02] shadow-none mb-5 lg:mb-7.5">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black text-gray-900">{stat.progress}%</p>
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Program Completion ({stat.completedTasks} / {stat.totalTasks} items)
                </span>
              </div>
              
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-500">
                    <KeenIcon icon="time" className="text-lg" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Awaiting Review</p>
                    <p className="text-base font-black text-gray-900">{stat.awaitingReviewTasks || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-s border-gray-200 ps-4">
                  <div className="size-8 rounded-lg bg-green-50 flex items-center justify-center text-success">
                    <KeenIcon icon="check-circle" className="text-lg" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Completed</p>
                    <p className="text-base font-black text-gray-900">{stat.completedTasks || 0}</p>
                  </div>
                </div>
              </div>
            </div>
            <Progress value={stat.progress} className="h-2 bg-white border border-primary/5" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7.5 items-stretch">
          <div className="lg:col-span-4">
            <Card className="h-full border-primary/10 shadow-sm hover:border-primary/20 transition-all overflow-hidden flex flex-col">
              <div className="h-2 bg-blue-500" />
              <CardHeader className="text-center pt-8 pb-6 px-6">
                <div className="mx-auto mb-4 relative">
                  <ProfileAvatar
                    userId={mentee?.id || ''}
                    currentAvatar={mentee?.avatar_url}
                    userName={mentee?.full_name || mentee?.email}
                    size="lg"
                  />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {mentee?.full_name || 'Mentee'}
                </CardTitle>
                <CardDescription className="font-medium text-gray-500">{mentee?.job_title || 'Program Participant'}</CardDescription>
                
                <div className="flex justify-center mt-4 gap-2">
                    <Badge variant="primary" className="font-bold uppercase text-[9px] tracking-widest px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                      Your Mentee
                    </Badge>
                    <Badge variant="secondary" className="text-[9px] uppercase tracking-widest px-2 py-0.5">
                      {stat.pair.status}
                    </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-6 px-6 pb-8">
                <Separator className="bg-gray-100" />
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Contact Details</h4>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-sm">
                      <KeenIcon icon="sms" className="text-gray-400 text-lg" />
                      <span className="text-gray-700 truncate font-medium">{mentee?.email}</span>
                    </div>
                    {mentee?.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <KeenIcon icon="phone" className="text-gray-400 text-lg" />
                        <span className="text-gray-700 font-medium">{mentee?.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-7.5">
            <Card className="shadow-none border-gray-100 bg-gray-50/30 flex flex-col h-full">
              <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 px-6">
                <CardTitle className="text-xs font-black uppercase tracking-[0.1em] flex items-center gap-2 text-gray-500">
                  <KeenIcon icon="clipboard" className="text-success text-base" />
                  Action Checklist
                </CardTitle>
                <Button 
                  variant="ghost" 
                  mode="link"
                  size="sm" 
                  className="text-success font-black uppercase text-[10px] hover:bg-success/5 h-7 px-0"
                  onClick={() => goToTasks(stat.pair.id)}
                >
                  Go to Tasks
                </Button>
              </CardHeader>
              <CardContent className="px-6 pb-6 flex-1 space-y-6">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">What to do next</h4>
                  {stat.nextTask ? (
                    <div 
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer group",
                        stat.nextTask.status === 'revision_required' 
                          ? "border-red-300 bg-red-50/50 hover:bg-red-50" 
                          : "border-success/20 bg-success/[0.03] hover:bg-success/[0.06]"
                      )}
                      onClick={() => goToTasks(stat.pair.id, stat.nextTask.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "size-8 rounded-full text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0 mt-0.5",
                          stat.nextTask.status === 'revision_required' ? "bg-red-600 shadow-red-200" : "bg-success shadow-success/20"
                        )}>
                          <KeenIcon icon={stat.nextTask.status === 'revision_required' ? "information-2" : "rocket"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-bold transition-colors break-words",
                            stat.nextTask.status === 'revision_required' ? "text-red-900 group-hover:text-red-700" : "text-gray-900 group-hover:text-success"
                          )}>
                            {stat.nextTask.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-gray-100 bg-white flex items-center gap-3">
                      <div className="size-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                        <KeenIcon icon="check" />
                      </div>
                      <p className="text-sm font-bold text-gray-500">All tasks completed!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none border-gray-100 bg-gray-50/30 flex flex-col h-full">
              <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 px-6">
                <CardTitle className="text-xs font-black uppercase tracking-[0.1em] flex items-center gap-2 text-gray-500">
                  <KeenIcon icon="calendar-tick" className="text-primary text-base" />
                  Upcoming Meetings
                </CardTitle>
                <Button 
                  variant="ghost" 
                  mode="link"
                  size="sm" 
                  className="text-primary font-black uppercase text-[10px] hover:bg-primary/5 h-7 px-0"
                  onClick={() => goToMeetings(stat.pair.id)}
                >
                  Go to Calendar
                </Button>
              </CardHeader>
              <CardContent className="px-6 pb-6 flex-1">
                {stat.upcomingPairMeetings.length > 0 ? (
                  <div className="space-y-3">
                    {stat.upcomingPairMeetings.slice(0, 3).map((meeting: any) => (
                      <div 
                        key={meeting.id} 
                        className="group p-4 rounded-2xl border border-white bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
                        onClick={() => goToMeetings(stat.pair.id)}
                      >
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors truncate">
                            {meeting.task?.name || meeting.title}
                          </span>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                              <KeenIcon icon="calendar" className="text-xs text-primary/60" />
                              {format(new Date(meeting.date_time), 'MMM d')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-white/50 rounded-2xl border border-dashed border-gray-200">
                    <KeenIcon icon="calendar" className="text-xl text-gray-300 mb-3" />
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest px-4">No sessions scheduled</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4 lg:gap-6">
      {activePairings.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 bg-gray-50/30">
          <CardContent className="py-20 text-center">
            <KeenIcon icon="info-circle" className="text-5xl text-gray-200 mb-4" />
            <h3 className="text-xl font-bold text-gray-900">No active mentees assigned</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-2 font-medium">
              You are not currently assigned as a mentor to any participants.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mb-4">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 whitespace-nowrap">Your Mentees</h2>
            <div className="h-px bg-gray-200 flex-1" />
          </div>
          {pairStats
            .filter(s => s.pair.mentor_id === user?.id && s.pair.status === 'active')
            .map(stat => renderRelationshipSection(stat))
          }
        </div>
      )}
    </div>
  );
}
