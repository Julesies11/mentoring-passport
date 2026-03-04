import { useAuth } from '@/auth/context/auth-context';
import { usePairing } from '@/providers/pairing-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeenIcon } from '@/components/keenicons';
import { useNavigate } from 'react-router-dom';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function ProgramMemberRelationshipPage() {
  const { isMentor, isMentee } = useAuth();
  const { pairings: pairs = [], isLoading, selectedPairing } = usePairing();
  const navigate = useNavigate();

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

  const renderRelationshipCard = (pair: any) => {
    const person = isMentor ? pair.mentee : pair.mentor;
    const roleLabel = isMentor ? 'Mentee' : 'Mentor';

    if (!person) return null;

    return (
      <Card key={pair.id} className="hover:shadow-md transition-all duration-300 border-0 sm:border shadow-none sm:shadow-sm">
        <CardHeader className="pb-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-50 sm:border-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ProfileAvatar
                userId={person.id}
                currentAvatar={person.avatar_url}
                userName={person.full_name || undefined}
                size="sm"
              />
              <div className="flex flex-col min-w-0">
                <CardTitle className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {person.full_name || 'Unknown'}
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs truncate max-w-[150px] sm:max-w-[200px]">
                  {person.email}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={cn("capitalize font-semibold text-[9px] sm:text-[10px] px-2 h-5 border-none", getStatusVariant(pair.status))}>
              {pair.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6 pt-4 sm:pt-0">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-600 font-medium">
              <KeenIcon icon="sms" className="text-muted-foreground text-base sm:text-lg" />
              <span className="truncate">{person.email}</span>
            </div>
            {person.job_title && (
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-600 font-medium">
                <KeenIcon icon="briefcase" className="text-muted-foreground text-base sm:text-lg" />
                <span className="truncate">{person.job_title}</span>
              </div>
            )}
            {person.department && (
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-600 font-medium">
                <KeenIcon icon="abstract-24" className="text-muted-foreground text-base sm:text-lg" />
                <span className="truncate">{person.department}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-gray-600 font-medium">
              <KeenIcon icon="calendar-tick" className="text-muted-foreground text-base sm:text-lg" />
              <span>Paired on {format(new Date(pair.created_at), 'PPP')}</span>
            </div>
          </div>
          
          <div className="flex gap-2.5 pt-2 border-t border-gray-50 sm:border-transparent">
            <Button size="sm" variant="outline" className="flex-1 bg-gray-50 hover:bg-gray-100 border-transparent text-xs h-8 sm:h-9" onClick={() => navigate('/program-member/tasks')}>
              <KeenIcon icon="list" />
              Tasks
            </Button>
            <Button size="sm" variant="outline" className="flex-1 bg-gray-50 hover:bg-gray-100 border-transparent text-xs h-8 sm:h-9" onClick={() => navigate('/program-member/meetings')}>
              <KeenIcon icon="calendar" />
              Meetings
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <ToolbarHeading
              title={isMentor ? "My Mentees" : "My Mentors"}
              description="Manage and track your mentoring relationships"
            />
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0 mt-4">
        <div className="grid gap-2 sm:gap-5 lg:gap-7.5">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
              <p>Loading relationships...</p>
            </div>
          ) : pairs.length === 0 ? (
            <Card className="border-0 sm:border shadow-none sm:shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <KeenIcon icon="users" className="text-4xl text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Relationships Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 px-4">
                  You haven't been assigned any {isMentor ? 'mentees' : 'mentors'} yet. 
                  Contact your supervisor to get paired and start your mentoring journey.
                </p>
                <Badge variant="outline" className="font-bold uppercase tracking-widest text-[10px] px-3 h-6 border-gray-200">
                  Awaiting Pairings
                </Badge>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {pairs.map(renderRelationshipCard)}
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
