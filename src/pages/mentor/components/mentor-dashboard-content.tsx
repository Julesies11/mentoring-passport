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
import { Link, useNavigate } from 'react-router-dom';
import { usePairing } from '@/providers/pairing-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function MentorDashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const { fetchPairTasks } = useTasks();
  const { meetings = [] } = useAllMeetings();
  const { setSelectedPairingId, selectedPairing } = usePairing();

  const [pairStats, setPairStats] = useState<any[]>([]);
  const [selectedPairTasks, setSelectedPairTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      if (pairs.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const stats = await Promise.all(pairs.map(async (pair) => {
          const tasks = await fetchPairTasks(pair.id);
          const pairMeetings = meetings.filter(m => m.pair_id === pair.id);
          
          const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
          const totalTasks = tasks.length;
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          
          const nextMeeting = pairMeetings
            .filter(m => m.status === 'upcoming' && new Date(m.date_time) > new Date())
            .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())[0];

          if (pair.id === selectedPairing?.id) {
            setSelectedPairTasks(tasks);
          }

          return {
            pair,
            completedTasks,
            totalTasks,
            progress,
            nextMeeting,
            tasks
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
  }, [pairs, fetchPairTasks, meetings, selectedPairing?.id]);

  const upcomingMeetings = useMemo(() => {
    if (!selectedPairing) return [];
    return meetings
      .filter(m => m.pair_id === selectedPairing.id && m.status === 'upcoming' && new Date(m.date_time) > new Date())
      .sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
      .slice(0, 3);
  }, [meetings, selectedPairing]);

  const pendingTasks = useMemo(() => {
    return selectedPairTasks
      .filter(t => t.status !== 'completed')
      .slice(0, 3);
  }, [selectedPairTasks]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (pairs.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <KeenIcon icon="info-circle" className="text-4xl text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No active mentees</h3>
          <p className="text-muted-foreground">You are not currently assigned to any mentees.</p>
        </CardContent>
      </Card>
    );
  }

  const handlePairClick = (pairId: string) => {
    setSelectedPairingId(pairId);
  };

  const goToTasks = (pairId: string) => {
    setSelectedPairingId(pairId);
    navigate('/program-member/tasks');
  };

  const goToMeetings = (pairId: string) => {
    setSelectedPairingId(pairId);
    navigate('/program-member/meetings');
  };

  return (
    <div className="grid gap-5 lg:gap-7.5">
      {/* Mentee Selection/Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7.5">
        {pairStats.map((stat) => (
          <Card 
            key={stat.pair.id} 
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md",
              selectedPairing?.id === stat.pair.id ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/30"
            )}
            onClick={() => handlePairClick(stat.pair.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <ProfileAvatar 
                    userId={stat.pair.mentee?.id || ''} 
                    currentAvatar={stat.pair.mentee?.avatar_url}
                    userName={stat.pair.mentee?.full_name} 
                    size="md" 
                  />
                  <div>
                    <CardTitle className="text-base">{stat.pair.mentee?.full_name}</CardTitle>
                    <p className="text-xs text-muted-foreground">Mentee</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={stat.pair.status === 'active' ? 'default' : 'secondary'}>
                    {stat.pair.status}
                  </Badge>
                  {selectedPairing?.id === stat.pair.id && (
                    <span className="text-[10px] font-bold text-primary uppercase">Active View</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-muted-foreground">Mentee Progress</span>
                    <span className="font-bold">{stat.completedTasks}/{stat.totalTasks} tasks</span>
                  </div>
                  <Progress value={stat.progress} className="h-2" />
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="flex-1 gap-1.5 text-xs h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToTasks(stat.pair.id);
                    }}
                  >
                    <KeenIcon icon="clipboard" className="text-sm" />
                    Tasks
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="flex-1 gap-1.5 text-xs h-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToMeetings(stat.pair.id);
                    }}
                  >
                    <KeenIcon icon="calendar" className="text-sm" />
                    Meetings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7.5">
        {/* Left Column: Mentee Details (8 cols) */}
        <div className="lg:col-span-8 space-y-5 lg:space-y-7.5">
          {selectedPairing ? (
            <Card className="border-primary/20 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <ProfileAvatar 
                    userId={selectedPairing.mentee?.id || ''} 
                    currentAvatar={selectedPairing.mentee?.avatar_url}
                    userName={selectedPairing.mentee?.full_name} 
                    size="lg" 
                  />
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">{selectedPairing.mentee?.full_name}</CardTitle>
                    <CardDescription className="font-medium">{selectedPairing.mentee?.email}</CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate('/program-member/notes')}>
                    <KeenIcon icon="message-question" />
                    Message
                  </Button>
                  <Button size="sm" className="gap-2" onClick={() => goToMeetings(selectedPairing.id)}>
                    <KeenIcon icon="calendar" />
                    Schedule
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Contact & Info</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-secondary/5">
                        <div className="size-8 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm">
                          <KeenIcon icon="sms" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground leading-none mb-1 uppercase">Email Address</span>
                          <span className="text-sm font-bold text-gray-800">{selectedPairing.mentee?.email}</span>
                        </div>
                      </div>
                      
                      {selectedPairing.mentee?.phone && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-secondary/5">
                          <div className="size-8 rounded-lg bg-white flex items-center justify-center text-success shadow-sm">
                            <KeenIcon icon="phone" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground leading-none mb-1 uppercase">Phone Number</span>
                            <span className="text-sm font-bold text-gray-800">{selectedPairing.mentee?.phone}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-secondary/5">
                        <div className="size-8 rounded-lg bg-white flex items-center justify-center text-warning shadow-sm">
                          <KeenIcon icon="calendar-add" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground leading-none mb-1 uppercase">Paired Since</span>
                          <span className="text-sm font-bold text-gray-800">{format(new Date(selectedPairing.created_at), 'PPP')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Quick Actions</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3 h-auto py-3 px-4 hover:bg-primary/5 hover:border-primary/30 transition-all group"
                        onClick={() => goToTasks(selectedPairing.id)}
                      >
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          <KeenIcon icon="clipboard" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-bold text-gray-900">Review Tasks</span>
                          <span className="text-[10px] text-muted-foreground font-medium">Check and approve evidence</span>
                        </div>
                      </Button>

                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3 h-auto py-3 px-4 hover:bg-success/5 hover:border-success/30 transition-all group"
                        onClick={() => goToMeetings(selectedPairing.id)}
                      >
                        <div className="size-8 rounded-lg bg-success/10 flex items-center justify-center text-success group-hover:bg-success group-hover:text-white transition-all">
                          <KeenIcon icon="calendar" />
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-bold text-gray-900">Meeting Log</span>
                          <span className="text-[10px] text-muted-foreground font-medium">View history and upcoming sessions</span>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <KeenIcon icon="profile-circle" className="text-5xl text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Mentee Selected</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Please select a pairing card above to view mentee details.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Mentoring Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-gray-900">
                    <KeenIcon icon="users" className="text-primary" />
                    Regular Check-ins
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">Maintain a consistent meeting schedule to keep your mentees engaged and on track.</p>
                </div>
                <div className="p-4 border rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-gray-900">
                    <KeenIcon icon="message-text" className="text-success" />
                    Provide Feedback
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">Review task evidence regularly and provide constructive feedback to support development.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Upcoming Items (4 cols) */}
        <div className="lg:col-span-4 space-y-5 lg:space-y-7.5">
          {/* Upcoming Meetings List */}
          <Card className="flex flex-col h-full shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <KeenIcon icon="calendar-tick" className="text-primary" />
                Upcoming Meetings
              </CardTitle>
              <Button 
                variant="ghost" 
                size="xs" 
                className="text-primary font-bold hover:bg-primary/5"
                onClick={() => selectedPairing && goToMeetings(selectedPairing.id)}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length > 0 ? (
                <div className="space-y-4">
                  {upcomingMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="group p-3 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => selectedPairing && goToMeetings(selectedPairing.id)}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900 group-hover:text-primary transition-colors truncate pr-2">
                            {meeting.title}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold border-gray-200">
                            {meeting.meeting_type?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                          <div className="flex items-center gap-1">
                            <KeenIcon icon="calendar" className="text-xs" />
                            {format(new Date(meeting.date_time), 'MMM d')}
                          </div>
                          <div className="flex items-center gap-1">
                            <KeenIcon icon="time" className="text-xs" />
                            {format(new Date(meeting.date_time), 'p')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <KeenIcon icon="calendar" className="text-3xl text-gray-300 mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">No upcoming meetings</p>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="mt-1 text-primary font-bold"
                    onClick={() => selectedPairing && goToMeetings(selectedPairing.id)}
                  >
                    Schedule one
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Tasks List */}
          <Card className="flex flex-col h-full shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <KeenIcon icon="clipboard" className="text-success" />
                Pending Tasks
              </CardTitle>
              <Button 
                variant="ghost" 
                size="xs" 
                className="text-success font-bold hover:bg-success/5"
                onClick={() => selectedPairing && goToTasks(selectedPairing.id)}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {pendingTasks.length > 0 ? (
                <div className="space-y-4">
                  {pendingTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="group p-3 rounded-xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => selectedPairing && goToTasks(selectedPairing.id)}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900 group-hover:text-success transition-colors truncate pr-2">
                            {task.name}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-[9px] uppercase font-black tracking-wider",
                              task.status === 'not_submitted' ? "bg-gray-100 text-gray-500" : "bg-warning-light text-warning-700"
                            )}
                          >
                            {task.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                        {task.task?.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 italic">
                            {task.task.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <KeenIcon icon="check-circle" className="text-3xl text-success/30 mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">All caught up!</p>
                  <p className="text-[11px] text-muted-foreground mt-1">No pending tasks for now.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
