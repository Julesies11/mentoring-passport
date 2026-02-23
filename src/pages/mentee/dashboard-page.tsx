import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { useTasks } from '@/hooks/use-tasks';
import { useAllMeetings } from '@/hooks/use-meetings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCircle, Calendar, CheckCircle, Clock } from 'lucide-react';

export function MenteeDashboardPage() {
  const { user } = useAuth();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const { fetchPairTasks } = useTasks();
  const { meetings = [] } = useAllMeetings();

  const [mentorInfo, setMentorInfo] = useState<any>(null);
  const [menteeTasks, setMenteeTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    const fetchMenteeData = async () => {
      if (pairs.length === 0) {
        setTasksLoading(false);
        return;
      }

      // Get mentor info from the first pair
      const pair = pairs[0];
      setMentorInfo(pair.mentor);

      try {
        const allTasks: any[] = [];
        for (const pair of pairs) {
          const tasks = await fetchPairTasks(pair.id);
          allTasks.push(...tasks);
        }
        setMenteeTasks(allTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchMenteeData();
  }, [pairs, fetchPairTasks]);

  // Calculate statistics
  const completedTasks = menteeTasks.filter((task: any) => task.status === 'completed').length;
  const totalTasks = menteeTasks.length;
  const upcomingMeetings = meetings.filter((meeting: any) => 
    pairs.some(pair => pair.id === meeting.pair_id) &&
    meeting.status === 'upcoming' && 
    new Date(meeting.date_time) > new Date()
  );

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Mentee Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Welcome back, {user?.full_name || user?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7.5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Mentor</CardTitle>
              <UserCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {mentorInfo ? (
                <div>
                  <p className="text-lg font-semibold">{mentorInfo.full_name}</p>
                  <p className="text-sm text-muted-foreground">{mentorInfo.email}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not assigned yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTasks}/{totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% complete
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Meeting</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {upcomingMeetings.length > 0 ? (
                <div>
                  <p className="text-lg font-semibold">{upcomingMeetings[0].title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(upcomingMeetings[0].date_time).toLocaleDateString()}
                  </p>
                  <Badge variant="outline" className="mt-1">
                    {new Date(upcomingMeetings[0].date_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No meetings scheduled</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Development Journey</h3>
          </div>
          <div className="card-body">
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground">
                • Connect with your mentor and build a professional relationship
              </p>
              <p className="text-muted-foreground">
                • Complete mentoring tasks and track your progress
              </p>
              <p className="text-muted-foreground">
                • Attend meetings and participate in mentoring activities
              </p>
              <p className="text-muted-foreground">
                • Reflect on your learning and career development
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
