import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { KeenIcon } from '@/components/keenicons';
import { ProfileAvatar } from '@/components/profile/profile-avatar';

export function MentorInfoContent() {
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
    navigate('/mentee/notes');
  };

  const handleScheduleMeeting = () => {
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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <KeenIcon icon="profile-circle" className="text-5xl text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-gray-900">No Mentor Assigned</h3>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm mx-auto">
            You haven't been paired with a mentor yet. Your supervisor is working on matching you with the best fit for your development journey.
          </p>
          <Badge variant="outline" className="font-medium">Pending Assignment</Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7.5">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader className="text-center pt-8">
            <div className="mx-auto mb-4">
              <ProfileAvatar
                userId={mentorInfo.id}
                currentAvatar={mentorInfo.avatar_url}
                userName={mentorInfo.full_name}
                size="lg"
              />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">{mentorInfo.full_name}</CardTitle>
            <CardDescription className="font-medium">{mentorInfo.email}</CardDescription>
            <div className="flex justify-center mt-3">
                <Badge variant="outline" className="bg-primary-light text-primary border-primary/20 font-semibold">Mentor</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <Separator className="bg-border/50" />
            <div className="space-y-4">
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={handleEmailClick}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground group-hover:bg-primary-light group-hover:text-primary transition-all">
                    <KeenIcon icon="sms" className="text-lg" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors">{mentorInfo.email}</span>
              </div>
              
              {mentorInfo.phone && (
                <div 
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={handlePhoneClick}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground group-hover:bg-success-light group-hover:text-success transition-all">
                    <KeenIcon icon="phone" className="text-lg" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-success transition-colors">{mentorInfo.phone}</span>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-secondary-foreground">
                    <KeenIcon icon="calendar-add" className="text-lg" />
                </div>
                <span className="text-sm font-medium text-gray-700">Paired on {new Date(pairs[0].created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <Separator className="bg-border/50" />
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={handleSendMessage}>
                <KeenIcon icon="message-question" />
                Send Message
              </Button>
              <Button variant="outline" className="w-full" onClick={handleScheduleMeeting}>
                <KeenIcon icon="calendar" />
                Schedule Meeting
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 flex flex-col gap-5 lg:gap-7.5">
        <Card>
          <CardHeader>
            <CardTitle>About Your Mentor</CardTitle>
            <CardDescription>Background and expertise of {mentorInfo.full_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <KeenIcon icon="user-tick" className="text-primary text-base" />
                  Professional Background
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {mentorInfo.bio || 'Your mentor has extensive experience in their field and is dedicated to helping you achieve your professional goals.'}
                </p>
              </div>
              
              {mentorInfo.specialties && mentorInfo.specialties.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <KeenIcon icon="award" className="text-warning text-base" />
                    Areas of Expertise
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {mentorInfo.specialties.map((specialty: string, index: number) => (
                      <Badge key={index} variant="outline" className="bg-secondary/50 font-medium">{specialty}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <KeenIcon icon="teacher" className="text-success text-base" />
                  Mentoring Style
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {mentorInfo.mentoring_style || 'Collaborative and supportive, focusing on your individual needs and career aspirations.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relationship Timeline</CardTitle>
            <CardDescription>Key milestones in your mentoring journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative ps-8 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-border">
              <div className="relative">
                <div className="absolute -left-[31px] top-1 flex items-center justify-center w-6 h-6 rounded-full bg-success text-white">
                  <KeenIcon icon="check" className="text-xs" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Mentorship Established</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(pairs[0].created_at).toLocaleDateString()} - You were officially paired with your mentor.
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute -left-[31px] top-1 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white">
                  <KeenIcon icon="user-edit" className="text-xs" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Profile Initialized</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Profile details and contact information were shared.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
