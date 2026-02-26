import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { UserCircle, Mail, Phone, Calendar, MessageSquare } from 'lucide-react';

export function MenteeMentorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const [mentorInfo, setMentorInfo] = useState<any>(null);

  useEffect(() => {
    if (pairs.length > 0) {
      const pair = pairs[0];
      setMentorInfo(pair.mentor);
    }
  }, [pairs]);

  const handleSendMessage = () => {
    // Navigate to notes page to send a message to mentor
    navigate('/mentee/notes');
  };

  const handleScheduleMeeting = () => {
    // Navigate to meetings page to schedule a meeting
    navigate('/mentee/meetings');
  };

  const handleEmailClick = () => {
    if (mentorInfo?.email) {
      window.open(`mailto:${mentorInfo.email}`, '_blank');
    }
  };

  const handlePhoneClick = () => {
    if (mentorInfo?.phone) {
      window.open(`tel:${mentorInfo.phone}`, '_blank');
    }
  };

  if (!mentorInfo) {
    return (
      <div className="container-fixed">
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">My Mentor</h1>
            <p className="text-sm text-gray-600">View your mentor information and contact details</p>
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Mentor Assigned</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                You haven't been paired with a mentor yet. Please check back later or contact your supervisor.
              </p>
              <Badge variant="outline">Pending Assignment</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">My Mentor</h1>
          <p className="text-sm text-gray-600">View your mentor information and contact details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7.5">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4">
                  <UserCircle className="h-20 w-20 text-primary" />
                </div>
                <CardTitle className="text-xl">{mentorInfo.full_name}</CardTitle>
                <CardDescription>{mentorInfo.email}</CardDescription>
                <Badge variant="secondary" className="mt-2">Mentor</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                <div className="space-y-3">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors"
                    onClick={handleEmailClick}
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{mentorInfo.email}</span>
                  </div>
                  {mentorInfo.phone && (
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors"
                      onClick={handlePhoneClick}
                    >
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{mentorInfo.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Paired on {new Date(pairs[0].created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button className="flex-1" size="sm" onClick={handleSendMessage}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleScheduleMeeting}>
                    Schedule Meeting
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-5 lg:gap-7.5">
            <Card>
              <CardHeader>
                <CardTitle>About Your Mentor</CardTitle>
                <CardDescription>Learn more about your mentor's background and expertise</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Professional Background</h4>
                    <p className="text-sm text-muted-foreground">
                      {mentorInfo.bio || 'Your mentor has extensive experience in their field and is dedicated to helping you achieve your professional goals.'}
                    </p>
                  </div>
                  
                  {mentorInfo.specialties && (
                    <div>
                      <h4 className="font-medium mb-2">Areas of Expertise</h4>
                      <div className="flex flex-wrap gap-2">
                        {mentorInfo.specialties.map((specialty: string, index: number) => (
                          <Badge key={index} variant="outline">{specialty}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium mb-2">Mentoring Style</h4>
                    <p className="text-sm text-muted-foreground">
                      {mentorInfo.mentoring_style || 'Collaborative and supportive, focusing on your individual needs and career aspirations.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your mentor's recent interactions with you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Mentorship relationship established</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(pairs[0].created_at).toLocaleDateString()} - You were paired with your mentor
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-medium">Profile updated</p>
                      <p className="text-xs text-muted-foreground">
                        Your mentor has completed their profile information
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
