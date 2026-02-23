import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { useTasks } from '@/hooks/use-tasks';
import { useAllMeetings } from '@/hooks/use-meetings';

export function MentorDashboardPage() {
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
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Mentor Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Welcome back, {user?.full_name || user?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7.5">
          <div className="card p-7.5">
            <h3 className="text-lg font-semibold mb-2">My Mentees</h3>
            <p className="text-3xl font-bold text-primary">{menteeCount}</p>
          </div>

          <div className="card p-7.5">
            <h3 className="text-lg font-semibold mb-2">Tasks Completed</h3>
            <p className="text-3xl font-bold text-success">{completedTasks}/{totalTasks}</p>
          </div>

          <div className="card p-7.5">
            <h3 className="text-lg font-semibold mb-2">Upcoming Meetings</h3>
            <p className="text-3xl font-bold text-info">{upcomingMeetings}</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Your Mentoring Journey</h3>
          </div>
          <div className="card-body">
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground">
                • Guide your mentees through their professional development
              </p>
              <p className="text-muted-foreground">
                • Complete mentoring tasks and upload evidence
              </p>
              <p className="text-muted-foreground">
                • Schedule and track meetings with your mentees
              </p>
              <p className="text-muted-foreground">
                • Share notes and reflections on your mentoring experience
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
