import { useState, useEffect, useMemo, Fragment } from 'react';
import { useAuth } from '@/auth/context/auth-context';
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
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';

export function ProgramMemberDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pairings = [], isLoading: pairingsLoading, setSelectedPairingId } = usePairing();
  const { fetchPairTasks } = useTasks();
  const { meetings = [] } = useAllMeetings();

  const [pairStats, setPairStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Group pairings by role for the user (only active ones for dashboard)
  const mentorPairings = useMemo(() => 
    pairings.filter(p => p.mentor_id === user?.id && p.status === 'active'),
    [pairings, user?.id]
  );
  
  const menteePairings = useMemo(() => 
    pairings.filter(p => p.mentee_id === user?.id && p.status === 'active'),
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

          // Logic for "What to do next" - Prioritize revisions over new tasks
          const nextTask = sortedTasks.find((t: any) => t.status === 'revision_required') || 
                           sortedTasks.find((t: any) => t.status === 'not_submitted');
          
          // Logic for "Recent Activity"
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
        console.error('Error fetching dashboard data:', error);
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

  const renderRelationshipSection = (stat: any, role: 'mentor' | 'mentee') => {
    const partner = role === 'mentor' ? stat.pair.mentee : stat.pair.mentor;
    const isMentorView = role === 'mentor';

    return (
      <div key={stat.pair.id} className="mb-12 last:mb-0">
        {/* Progress Card (Full Width at Top) */}
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
          {/* Profile Card (4 cols) */}
          <div className="lg:col-span-4">
            <Card className="h-full border-primary/10 shadow-sm hover:border-primary/20 transition-all overflow-hidden flex flex-col">
              <div className={cn(
                  "h-2",
                  isMentorView ? "bg-blue-500" : "bg-green-500"
              )} />
              <CardHeader className="text-center pt-8 pb-6 px-6">
                <div className="mx-auto mb-4 relative">
                  <ProfileAvatar
                    userId={partner?.id || ''}
                    currentAvatar={partner?.avatar_url}
                    userName={partner?.full_name || partner?.email}
                    size="lg"
                  />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {partner?.full_name || 'Partner'}
                </CardTitle>
                <CardDescription className="font-medium text-gray-500">{partner?.job_title || 'Program Member'}</CardDescription>
                
                <div className="flex justify-center mt-4 gap-2">
                    <Badge variant="outline" className={cn(
                      "font-bold uppercase text-[9px] tracking-widest px-2 py-0.5",
                      isMentorView ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200"
                    )}>
                      {isMentorView ? 'Your Mentee' : 'Your Mentor'}
                    </Badge>
                    <Badge variant="secondary" className="text-[9px] uppercase tracking-widest px-2 py-0.5">{stat.pair.status}</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 space-y-6 px-6 pb-8">
                <Separator className="bg-gray-100" />
                
                {/* Contact Info */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Contact Details</h4>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 text-sm">
                      <KeenIcon icon="sms" className="text-gray-400 text-lg" />
                      <span className="text-gray-700 truncate font-medium">{partner?.email}</span>
                    </div>
                    {partner?.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <KeenIcon icon="phone" className="text-gray-400 text-lg" />
                        <span className="text-gray-700 font-medium">{partner?.phone}</span>
                      </div>
                    )}
                    {partner?.department && (
                      <div className="flex items-center gap-3 text-sm">
                        <KeenIcon icon="bank" className="text-gray-400 text-lg" />
                        <span className="text-gray-700 font-medium">{partner?.department}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bio / About */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">About</h4>
                  <p className="text-xs text-gray-600 leading-relaxed italic line-clamp-4">
                    {partner?.bio || "No biography provided yet."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Center (8 cols) */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-7.5">
            {/* Action Checklist Card */}
            <Card className="shadow-none border-gray-100 bg-gray-50/30 flex flex-col h-full">
              <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 px-6">
                <CardTitle className="text-xs font-black uppercase tracking-[0.1em] flex items-center gap-2 text-gray-500">
                  <KeenIcon icon="clipboard" className="text-success text-base" />
                  Action Checklist
                </CardTitle>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-success font-black uppercase text-[10px] hover:bg-success/5 h-7 px-0"
                  onClick={() => goToTasks(stat.pair.id)}
                >
                  Go to Tasks
                </Button>
              </CardHeader>
              <CardContent className="px-6 pb-6 flex-1 space-y-6">
                {/* Next Action */}
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
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter mb-2">
                            {stat.nextTask.status === 'revision_required' ? 'Requires Attention' : 'Recommended priority'}
                          </p>

                          {stat.nextTask.status === 'revision_required' && stat.nextTask.last_feedback && (
                            <div className="mt-2 p-2.5 bg-white border border-red-100 rounded-xl">
                              <p className="text-[8px] font-black text-red-600 uppercase tracking-widest leading-none mb-1.5">Revision Notes</p>
                              <p className="text-[11px] text-red-800 font-medium italic leading-snug line-clamp-2">
                                "{stat.nextTask.last_feedback}"
                              </p>
                            </div>
                          )}

                          {stat.nextTask.status !== 'revision_required' && stat.nextTask.subtasks && stat.nextTask.subtasks.length > 0 && (
                            <div className="mt-3 space-y-2 border-t border-success/10 pt-3">
                              {stat.nextTask.subtasks.map((st: any) => (
                                <div key={st.id} className="flex items-start gap-2">
                                  <div className={cn(
                                    "size-3 rounded-sm border mt-0.5 shrink-0 transition-colors",
                                    st.is_completed ? "bg-success border-success" : "bg-white border-gray-300"
                                  )}>
                                    {st.is_completed && <KeenIcon icon="check" className="text-[8px] text-white" />}
                                  </div>
                                  <span className={cn(
                                    "text-[11px] leading-tight break-words",
                                    st.is_completed ? "text-gray-400 line-through font-medium" : "text-gray-700 font-bold"
                                  )}>
                                    {st.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
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
                {/* Recent Activity */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Recent activity</h4>
                  {stat.recentActivity.length > 0 ? (
                    <div className="space-y-2">
                      {stat.recentActivity.map((task: any) => (
                        <div 
                          key={task.id} 
                          className="flex items-center gap-3 p-3 rounded-xl border border-white bg-white/60 text-xs shadow-sm"
                        >
                          <div className={cn(
                              "size-2 rounded-full shrink-0",
                              task.status === 'completed' ? "bg-success" : 
                              task.status === 'revision_required' ? "bg-danger" : "bg-warning"
                          )} />
                          <span className="flex-1 font-semibold text-gray-700 break-words">{task.name}</span>
                          <span className={cn(
                            "text-[9px] font-black uppercase whitespace-nowrap",
                            task.status === 'revision_required' ? "text-danger" : "text-gray-400"
                          )}>
                              {task.status === 'completed' ? 'Finished' : 
                               task.status === 'revision_required' ? 'Needs Revision' : 'In Review'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic px-1">No recent task activity recorded.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Meetings */}
            <Card className="shadow-none border-gray-100 bg-gray-50/30 flex flex-col h-full">
              <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0 px-6">
                <CardTitle className="text-xs font-black uppercase tracking-[0.1em] flex items-center gap-2 text-gray-500">
                  <KeenIcon icon="calendar-tick" className="text-primary text-base" />
                  Upcoming Meetings
                </CardTitle>
                <Button 
                  variant="link" 
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
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors truncate pr-2">
                              {meeting.title}
                            </span>
                            <Badge variant="outline" className="text-[9px] uppercase font-black border-gray-100 h-5 px-2 bg-gray-50/50">
                              {meeting.meeting_type?.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                              <KeenIcon icon="calendar" className="text-xs text-primary/60" />
                              {format(new Date(meeting.date_time), 'MMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <KeenIcon icon="time" className="text-xs text-primary/60" />
                              {format(new Date(meeting.date_time), 'p')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-white/50 rounded-2xl border border-dashed border-gray-200">
                    <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <KeenIcon icon="calendar" className="text-xl text-gray-300" />
                    </div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest px-4">No sessions scheduled</p>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="mt-2 text-primary font-black uppercase text-[10px]"
                      onClick={() => goToMeetings(stat.pair.id, true)}
                    >
                      Schedule first meeting
                    </Button>
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
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Relationship Hub"
            description={`Welcome back, ${user?.full_name || user?.email}`}
          />
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-4 lg:gap-6">
          {pairings.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-200 bg-gray-50/30">
              <CardContent className="py-20 text-center">
                <KeenIcon icon="info-circle" className="text-5xl text-gray-200 mb-4" />
                <h3 className="text-xl font-bold text-gray-900">No active pairings found</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mt-2 font-medium">
                  You are not currently assigned to any mentoring relationships. Please contact your supervisor to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Fragment>
              {/* Mentor Relationships */}
              {menteePairings.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 whitespace-nowrap">Your Mentors</h2>
                    <div className="h-px bg-gray-200 flex-1" />
                  </div>
                  {pairStats
                    .filter(s => s.pair.mentee_id === user?.id && s.pair.status === 'active')
                    .map(stat => renderRelationshipSection(stat, 'mentee'))
                  }
                </div>
              )}

              {/* Mentee Relationships */}
              {mentorPairings.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 whitespace-nowrap">Your Mentees</h2>
                    <div className="h-px bg-gray-200 flex-1" />
                  </div>
                  {pairStats
                    .filter(s => s.pair.mentor_id === user?.id && s.pair.status === 'active')
                    .map(stat => renderRelationshipSection(stat, 'mentor'))
                  }
                </div>
              )}
            </Fragment>
          )}
        </div>
      </Container>
    </Fragment>
  );
}
