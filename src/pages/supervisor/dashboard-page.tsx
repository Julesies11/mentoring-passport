import { useAuth } from '@/auth/context/auth-context';

export function SupervisorDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Supervisor Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Welcome back, {user?.full_name || user?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7.5">
          <div className="card p-7.5">
            <h3 className="text-lg font-semibold mb-2">Total Participants</h3>
            <p className="text-3xl font-bold text-primary">0</p>
          </div>

          <div className="card p-7.5">
            <h3 className="text-lg font-semibold mb-2">Active Pairs</h3>
            <p className="text-3xl font-bold text-primary">0</p>
          </div>

          <div className="card p-7.5">
            <h3 className="text-lg font-semibold mb-2">Pending Evidence</h3>
            <p className="text-3xl font-bold text-warning">0</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground">
                • Manage participants and create mentor-mentee pairs
              </p>
              <p className="text-muted-foreground">
                • Review and approve evidence submissions
              </p>
              <p className="text-muted-foreground">
                • Monitor program progress and completion rates
              </p>
              <p className="text-muted-foreground">
                • Configure evidence types and program settings
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
