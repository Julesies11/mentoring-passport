import { useAllParticipants } from '@/hooks/use-participants';
import { useAllPairs } from '@/hooks/use-pairs';
import { useAllEvidence } from '@/hooks/use-evidence';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons';

export function SupervisorDashboardContent() {
  const { data: participants = [] } = useAllParticipants();
  const { data: pairs = [] } = useAllPairs();
  const { data: evidence = [] } = useAllEvidence();

  // Calculate statistics
  const totalParticipants = participants.length;
  const activePairs = pairs.length;
  const pendingEvidence = evidence.filter(item => item.status === 'pending').length;
  const completedPairs = pairs.filter(pair => {
    const pairTasks: any[] = []; // TODO: Get actual tasks for this pair
    return pairTasks.length > 0 && pairTasks.every(task => task.status === 'completed');
  }).length;

  // Calculate completion rate
  const completionRate = activePairs > 0 ? Math.round((completedPairs / activePairs) * 100) : 0;

  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7.5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <KeenIcon icon="users" className="text-2xl text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParticipants}</div>
            <p className="text-xs text-muted-foreground">All program participants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Pairs</CardTitle>
            <KeenIcon icon="disconnect" className="text-2xl text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePairs}</div>
            <p className="text-xs text-muted-foreground">Mentor-mentee relationships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Evidence</CardTitle>
            <KeenIcon icon="file-done" className="text-2xl text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingEvidence}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <KeenIcon icon="chart-line-up" className="text-2xl text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {completedPairs}/{activePairs} pairs completed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-7.5">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest program updates and actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">New pair created</p>
                  <p className="text-xs text-muted-foreground">
                    {pairs.length > 0 ? `${pairs.length} active mentoring relationships` : 'No pairs yet'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Evidence submitted</p>
                  <p className="text-xs text-muted-foreground">
                    {pendingEvidence} items awaiting review
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-info rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Participants enrolled</p>
                  <p className="text-xs text-muted-foreground">
                    {totalParticipants} users in the program
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Program Statistics</CardTitle>
            <CardDescription>Overall mentoring program metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Pairs</span>
                <Badge variant="outline">{activePairs}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Completion Rate</span>
                <Badge variant={completionRate >= 50 ? 'default' : 'secondary'}>
                  {completionRate}%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pending Reviews</span>
                <Badge variant="outline">{pendingEvidence}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Active Participants</span>
                <Badge variant="outline">{totalParticipants}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common supervisor tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-border rounded-xl">
              <h4 className="font-medium mb-2">Manage Participants</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Add, edit, or remove program participants
              </p>
              <Badge variant="outline">Participants Page</Badge>
            </div>
            <div className="p-4 border border-border rounded-xl">
              <h4 className="font-medium mb-2">Create Pairs</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Match mentors with mentees
              </p>
              <Badge variant="outline">Pairs Page</Badge>
            </div>
            <div className="p-4 border border-border rounded-xl">
              <h4 className="font-medium mb-2">Review Evidence</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Approve or reject evidence submissions
              </p>
              <Badge variant="outline">Evidence Review</Badge>
            </div>
            <div className="p-4 border border-border rounded-xl">
              <h4 className="font-medium mb-2">Monitor Progress</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Track program completion and engagement
              </p>
              <Badge variant="outline">Analytics</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
