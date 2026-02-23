import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail, Phone, Calendar, MessageSquare } from 'lucide-react';

export function MentorMenteesPage() {
  const { user } = useAuth();
  const { data: pairs = [], isLoading } = useUserPairs(user?.id || '');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container-fixed">
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">My Mentees</h1>
            <p className="text-sm text-gray-600">Loading mentees...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">My Mentees</h1>
          <p className="text-sm text-gray-600">
            Manage and track your mentoring relationships
          </p>
        </div>

        {pairs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Mentees Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  You haven't been assigned any mentees yet.
                </p>
                <p className="text-sm text-gray-500">
                  Contact your supervisor to get paired with mentees.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pairs.map((pair) => (
              <Card key={pair.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={pair.mentee?.avatar_url || ''} />
                        <AvatarFallback>
                          {pair.mentee?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {pair.mentee?.full_name || 'Unknown'}
                        </CardTitle>
                        <CardDescription>
                          {pair.mentee?.email}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={getStatusColor(pair.status)}>
                      {pair.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      {pair.mentee?.email}
                    </div>
                    {pair.mentee?.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {pair.mentee.phone}
                      </div>
                    )}
                    {pair.mentee?.department && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {pair.mentee.department}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                    <Button size="sm" className="flex-1">
                      View Tasks
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
