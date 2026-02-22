import { useAuth } from '@/auth/context/auth-context';

export function MentorDashboardPage() {
  const { user } = useAuth();

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
            <p className="text-3xl font-bold text-primary">0</p>
          </div>

          <div className="card p-7.5">
            <h3 className="text-lg font-semibold mb-2">Tasks Completed</h3>
            <p className="text-3xl font-bold text-success">0/16</p>
          </div>

          <div className="card p-7.5">
            <h3 className="text-lg font-semibold mb-2">Upcoming Meetings</h3>
            <p className="text-3xl font-bold text-info">0</p>
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
