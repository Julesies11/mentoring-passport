import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { useTasks } from '@/hooks/use-tasks';
import { useAllMeetings } from '@/hooks/use-meetings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeenIcon } from '@/components/keenicons';

export function MentorDashboardContent() {
  const { user } = useAuth();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const { fetchPairTasks } = useTasks();
  const { meetings = [] } = useAllMeetings();

  // Fetch tasks for each mentor pair
  const [mentorTasks, setMentorTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  useEffect(() => {
    const fetchAllTasks = async () => {
      if (pairs.length === 0) {
        setTasksLoading(false);
        return;
      }

      try {
        const allTasks: any[] = [];
        for (const pair of pairs) {
          const tasks = await fetchPairTasks(pair.id);
          allTasks.push(...tasks);
        }
        setMentorTasks(allTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setTasksLoading(false);
      }
    };

    fetchAllTasks();
  }, [pairs, fetchPairTasks]);

  // Calculate statistics
  const menteeCount = pairs.length;
  const completedTasks = mentorTasks.filter((task: any) => task.status === 'completed').length;
  const totalTasks = mentorTasks.length;
  const upcomingMeetings = meetings.filter((meeting: any) => 
    meeting.status === 'upcoming' && new Date(meeting.date_time) > new Date()
  ).length;

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7.5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Mentees</CardTitle>
            <KeenIcon icon="users" className="text-2xl text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{menteeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <KeenIcon icon="check-square" className="text-2xl text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedTasks}/{totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all assigned mentees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <KeenIcon icon="calendar" className="text-2xl text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{upcomingMeetings}</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled for this month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Mentoring Journey</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground flex items-center gap-2">
              <KeenIcon icon="dot" className="text-xs" />
              Guide your mentees through their professional development
            </p>
            <p className="text-muted-foreground flex items-center gap-2">
              <KeenIcon icon="dot" className="text-xs" />
              Complete mentoring tasks and upload evidence
            </p>
            <p className="text-muted-foreground flex items-center gap-2">
              <KeenIcon icon="dot" className="text-xs" />
              Schedule and track meetings with your mentees
            </p>
            <p className="text-muted-foreground flex items-center gap-2">
              <KeenIcon icon="dot" className="text-xs" />
              Share notes and reflections on your mentoring experience
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
