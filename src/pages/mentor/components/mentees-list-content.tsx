import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons';
import { useNavigate } from 'react-router-dom';
import { ProfileAvatar } from '@/components/profile/profile-avatar';

export function MenteesListContent() {
  const { user } = useAuth();
  const { data: pairs = [], isLoading } = useUserPairs(user?.id || '');
  const navigate = useNavigate();

  const handleViewTasks = (menteeId: string) => {
    navigate(`/mentor/tasks?mentee=${menteeId}`);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success-light text-success border-success/20';
      case 'completed':
        return 'bg-primary-light text-primary border-primary/20';
      case 'archived':
        return 'bg-secondary text-secondary-foreground border-border';
      default:
        return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
        <p>Loading mentees...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:gap-7.5">
      {pairs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <KeenIcon icon="user-tick" className="text-5xl text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Mentees Yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto text-center mb-6">
              You haven't been assigned any mentees yet. Contact your supervisor to get paired with mentees and start your mentoring journey.
            </p>
            <Badge variant="outline" className="font-medium">Awaiting Pairings</Badge>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pairs.map((pair) => (
            <Card key={pair.id} className="hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar
                      userId={pair.mentee?.id || ''}
                      currentAvatar={pair.mentee?.avatar_url}
                      userName={pair.mentee?.full_name}
                      size="sm"
                    />
                    <div className="flex flex-col">
                      <CardTitle className="text-base font-bold text-gray-900">
                        {pair.mentee?.full_name || 'Unknown'}
                      </CardTitle>
                      <CardDescription className="text-xs truncate max-w-[150px]">
                        {pair.mentee?.email}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={`capitalize font-semibold ${getStatusVariant(pair.status)}`}>
                    {pair.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 font-medium">
                    <KeenIcon icon="sms" className="text-muted-foreground" />
                    <span className="truncate">{pair.mentee?.email}</span>
                  </div>
                  {pair.mentee?.phone && (
                    <div className="flex items-center gap-2.5 text-sm text-gray-600 font-medium">
                      <KeenIcon icon="phone" className="text-muted-foreground" />
                      {pair.mentee.phone}
                    </div>
                  )}
                  {pair.mentee?.department && (
                    <div className="flex items-center gap-2.5 text-sm text-gray-600 font-medium">
                      <KeenIcon icon="abstract-24" className="text-muted-foreground" />
                      {pair.mentee.department}
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 font-medium">
                    <KeenIcon icon="calendar-tick" className="text-muted-foreground" />
                    Paired on {new Date(pair.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex gap-2.5 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 bg-secondary hover:bg-secondary-dark border-transparent">
                    <KeenIcon icon="message-question" />
                    Message
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => handleViewTasks(pair.mentee?.id || '')}>
                    <KeenIcon icon="list" />
                    View Tasks
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
