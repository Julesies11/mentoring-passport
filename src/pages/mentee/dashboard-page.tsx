import { useAuth } from '@/auth/context/auth-context';

export function MenteeDashboardPage() {
  const { user } = useAuth();

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
          <div className="card p-7.5">
            <h3 className="text-lg font-semibold mb-2">My Mentor</h3>
            <p className="text-sm text-muted-foreground">Not assigned yet</p>
          </div>

          <div className="card p-7.5">
            <h3 className="text-lg font-semibold mb-2">Tasks Completed</h3>
            <p className="text-3xl font-bold text-success">0/16</p>
          </div>

          <div className="card p-7.5">
            <h3 className="text-lg font-semibold mb-2">Next Meeting</h3>
            <p className="text-sm text-muted-foreground">No meetings scheduled</p>
          </div>
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
