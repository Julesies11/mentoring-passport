import { Fragment, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useAllEvidence } from '@/hooks/use-evidence';
import { useUserPairs } from '@/hooks/use-pairs';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KeenIcon } from '@/components/keenicons';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function MentorEvidencePage() {
  const { user } = useAuth();
  const { reviewEvidence } = useAllEvidence();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const { data: evidence = [], isLoading } = useAllEvidence();

  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [reviewData, setReviewData] = useState({
    status: 'approved' as const,
    feedback: ''
  });

  // Filter evidence for mentor's pairs
  const mentorEvidence = evidence.filter(item => 
    pairs.some(pair => pair.id === item.pair_id)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500 text-white border-none">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-success text-white border-none">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-danger text-white border-none">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <KeenIcon icon="time" />;
      case 'approved':
        return <KeenIcon icon="check-circle" />;
      case 'rejected':
        return <KeenIcon icon="cross-circle" />;
      default:
        return <KeenIcon icon="document" />;
    }
  };

  const handleReviewEvidence = async (evidenceId: string) => {
    try {
      await reviewEvidence(evidenceId, {
        status: reviewData.status,
        rejection_reason: reviewData.status === 'rejected' ? reviewData.feedback : undefined
      });
      setSelectedEvidence(null);
      setReviewData({ status: 'approved', feedback: '' });
    } catch (error) {
      console.error('Error reviewing evidence:', error);
    }
  };

  const handleViewFile = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Evidence Review"
            description="Review and approve evidence submitted by your mentees"
          />
          <ToolbarActions>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-100">
                {mentorEvidence.filter(e => e.status === 'pending').length} Pending
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100">
                {mentorEvidence.filter(e => e.status === 'approved').length} Approved
              </Badge>
            </div>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
              <p>Loading evidence submissions...</p>
            </div>
          ) : mentorEvidence.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <KeenIcon icon="file-up" className="text-3xl text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Evidence Submitted</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Your mentees haven't submitted any evidence for review yet. Evidence will appear here once they upload files for their tasks.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7.5">
              {mentorEvidence.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow flex flex-col h-full">
                  <div className="aspect-video bg-gray-100 flex items-center justify-center relative group overflow-hidden">
                    {item.type === 'photo' ? (
                      item.file_url ? (
                        <img 
                          src={item.file_url} 
                          alt={item.description}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <KeenIcon icon="picture" className="text-4xl text-gray-300" />
                      )
                    ) : (
                      <KeenIcon icon="document" className="text-4xl text-gray-300" />
                    )}
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-center mb-3 text-xs font-medium text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <KeenIcon icon="user" className="text-xs" />
                        {item.pair?.mentee?.full_name || 'Unknown Mentee'}
                      </span>
                      <span>{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    
                    <h4 className="text-sm font-bold text-gray-900 mb-2 line-clamp-1">
                      {item.task?.name || 'General Evidence'}
                    </h4>
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">
                      {item.description || 'No description provided.'}
                    </p>
                    
                    <div className="flex gap-2 pt-4 border-t border-gray-100 mt-auto">
                      {item.status === 'pending' ? (
                        <Dialog open={selectedEvidence?.id === item.id} onOpenChange={(open) => !open && setSelectedEvidence(null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="flex-1" onClick={() => setSelectedEvidence(item)}>
                              <KeenIcon icon="notepad-edit" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>Review Evidence Submission</DialogTitle>
                              <DialogDescription>
                                Reviewing evidence for task: <span className="text-gray-900 font-bold">{item.task?.name}</span>
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-5 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="status" className="text-gray-900 font-semibold">Decision *</Label>
                                <Select value={reviewData.status} onValueChange={(value: any) => setReviewData({...reviewData, status: value})}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="approved">Approve Evidence</SelectItem>
                                    <SelectItem value="rejected">Request Resubmission</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="grid gap-2">
                                <Label htmlFor="feedback" className="text-gray-900 font-semibold">
                                  {reviewData.status === 'approved' ? 'Feedback (Optional)' : 'Rejection Reason *'}
                                </Label>
                                <Textarea
                                  id="feedback"
                                  value={reviewData.feedback}
                                  onChange={(e) => setReviewData({...reviewData, feedback: e.target.value})}
                                  placeholder={reviewData.status === 'approved' ? "Great work! This meets all requirements." : "Please provide more detail in the documentation..."}
                                  rows={4}
                                  className="resize-none"
                                />
                              </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                              <Button variant="outline" onClick={() => setSelectedEvidence(null)}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={() => handleReviewEvidence(item.id)}
                                disabled={reviewData.status === 'rejected' && !reviewData.feedback.trim()}
                                className={reviewData.status === 'approved' ? 'bg-success hover:bg-success-dark' : 'bg-danger hover:bg-danger-dark'}
                              >
                                Submit Review
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-xs font-semibold text-gray-600">
                          {getStatusIcon(item.status)}
                          <span>Reviewed as {item.status}</span>
                        </div>
                      )}
                      
                      <Button size="sm" variant="outline" mode="icon" onClick={() => handleViewFile(item.file_url)}>
                        <KeenIcon icon="eye" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Container>
    </Fragment>
  );
}

