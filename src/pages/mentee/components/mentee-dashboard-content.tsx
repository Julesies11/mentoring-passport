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
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function MenteeDashboardContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const { fetchPairTasks } = useTasks();
  const { meetings = [] } = useAllMeetings();
  const { setSelectedPairingId, selectedPairing } = usePairing();

  const [pairStats, setPairStats] = useState<any[]>([]);
  const [selectedPairTasks, setSelectedPairTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const activeMentor = selectedPairing?.mentor;

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
            tasks // Keep for filtering
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
          <h3 className="text-lg font-semibold">No active pairings</h3>
          <p className="text-muted-foreground">You are not currently assigned to any mentoring pairs.</p>
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
      {/* Top Stats/Pairings */}
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
                    userId={stat.pair.mentor?.id || ''} 
                    currentAvatar={stat.pair.mentor?.avatar_url}
                    userName={stat.pair.mentor?.full_name} 
                    size="md" 
                  />
                  <div>
                    <CardTitle className="text-base">{stat.pair.mentor?.full_name}</CardTitle>
                    <p className="text-xs text-muted-foreground">Mentor</p>
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
                    <span className="font-medium text-muted-foreground">Progress</span>
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
        {/* Left Column: Mentor Details (8 cols) */}
        <div className="lg:col-span-8 space-y-5 lg:space-y-7.5">
          {activeMentor ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-7.5">
              {/* Profile Main Card */}
              <div className="md:col-span-1">
                <Card className="h-full">
                  <CardHeader className="text-center pt-8">
                    <div className="mx-auto mb-4">
                      <ProfileAvatar
                        userId={activeMentor.id}
                        currentAvatar={activeMentor.avatar_url}
                        userName={activeMentor.full_name}
                        size="lg"
                      />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">{activeMentor.full_name}</CardTitle>
                    <CardDescription className="font-medium">{activeMentor.email}</CardDescription>
                    <div className="flex justify-center mt-3">
                        <Badge variant="outline" className="bg-primary-light text-primary border-primary/20 font-semibold">Your Mentor</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Separator className="bg-border/50" />
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground">
                            <KeenIcon icon="sms" className="text-lg" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 truncate">{activeMentor.email}</span>
                      </div>
                      
                      {activeMentor.phone && (
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground">
                            <KeenIcon icon="phone" className="text-lg" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">{activeMentor.phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground">
                            <KeenIcon icon="calendar-add" className="text-lg" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Paired: {format(new Date(selectedPairing.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <Separator className="bg-border/50" />
                    <div className="flex flex-col gap-2">
                      <Button className="w-full gap-2" onClick={() => navigate('/program-member/notes')}>
                        <KeenIcon icon="message-question" />
                        Send Note
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bio & Details Cards */}
              <div className="md:col-span-2 space-y-5 lg:space-y-7.5">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">About Your Mentor</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <KeenIcon icon="user-tick" className="text-primary text-base" />
                        Background
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {activeMentor.bio || 'Your mentor is dedicated to helping you achieve your professional goals and navigating your development journey.'}
                      </p>
                    </div>
                    
                    {activeMentor.specialties && activeMentor.specialties.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <KeenIcon icon="award" className="text-warning text-base" />
                          Expertise
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {activeMentor.specialties.map((specialty: string, index: number) => (
                            <Badge key={index} variant="secondary" className="bg-secondary/50 font-medium">{specialty}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <KeenIcon icon="teacher" className="text-success text-base" />
                        Mentoring Style
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {activeMentor.mentoring_style || 'Collaborative and supportive, focusing on your individual needs and career aspirations.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <KeenIcon icon="profile-circle" className="text-5xl text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Mentor Selected</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Please select a pairing card above to view mentor details.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Mentoring Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-gray-900">
                    <KeenIcon icon="check-circle" className="text-success" />
                    Be Proactive
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">Regularly review your tasks and reach out to your mentor with questions to stay on track.</p>
                </div>
                <div className="p-4 border rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-gray-900">
                    <KeenIcon icon="camera" className="text-info" />
                    Evidence Matters
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">Capture proof of your achievements through photos or documents as you complete each task.</p>
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
