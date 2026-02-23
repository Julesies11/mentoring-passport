import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useAllEvidence } from '@/hooks/use-evidence';
import { useUserPairs } from '@/hooks/use-pairs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Eye, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

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
  const mentorEvidence = evidence.filter(evidence => 
    pairs.some(pair => pair.id === evidence.pair_id)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleReviewEvidence = async (evidenceId: string) => {
    try {
      await reviewEvidence(evidenceId, reviewData);
      setSelectedEvidence(null);
      setReviewData({ status: 'approved', feedback: '' });
    } catch (error) {
      console.error('Error reviewing evidence:', error);
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container-fixed">
        <div className="flex flex-col gap-5 lg:gap-7.5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold text-gray-900">Evidence Review</h1>
            <p className="text-sm text-gray-600">Loading evidence...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-gray-900">Evidence Review</h1>
          <p className="text-sm text-gray-600">
            Review and approve evidence submitted by your mentees
          </p>
        </div>

        <div className="flex gap-2">
          <Badge variant="outline" className="bg-yellow-50">
            {mentorEvidence.filter(e => e.status === 'pending').length} Pending Review
          </Badge>
          <Badge variant="outline" className="bg-green-50">
            {mentorEvidence.filter(e => e.status === 'approved').length} Approved
          </Badge>
          <Badge variant="outline" className="bg-red-50">
            {mentorEvidence.filter(e => e.status === 'rejected').length} Rejected
          </Badge>
        </div>

        {mentorEvidence.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Evidence Submitted
                </h3>
                <p className="text-gray-600 mb-4">
                  Your mentees haven't submitted any evidence yet.
                </p>
                <p className="text-sm text-gray-500">
                  Evidence will appear here once mentees submit their work.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {mentorEvidence.map((evidence) => (
              <Card key={evidence.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{evidence.title}</CardTitle>
                      <CardDescription>
                        Submitted by {evidence.pair?.mentee?.full_name || 'Unknown Mentee'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(evidence.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(evidence.status)}
                          {evidence.status}
                        </div>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div>
                        Submitted: {format(new Date(evidence.created_at), 'PPP')}
                      </div>
                      {evidence.type && (
                        <div>Type: {evidence.type}</div>
                      )}
                    </div>
                    
                    {evidence.description && (
                      <p className="text-gray-700">{evidence.description}</p>
                    )}
                    
                    {evidence.file_url && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {evidence.file_name || 'Evidence file'}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadFile(evidence.file_url, evidence.file_name || 'evidence')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    )}
                    
                    {evidence.status === 'pending' && (
                      <div className="flex gap-2">
                        <Dialog open={selectedEvidence?.id === evidence.id} onOpenChange={(open) => !open && setSelectedEvidence(null)}>
                          <DialogTrigger asChild>
                            <Button onClick={() => setSelectedEvidence(evidence)}>
                              Review Evidence
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Review Evidence</DialogTitle>
                              <DialogDescription>
                                Review "{evidence.title}" submitted by {evidence.pair?.mentee?.full_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="status">Decision</Label>
                                <Select value={reviewData.status} onValueChange={(value: any) => setReviewData({...reviewData, status: value})}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="approved">Approve</SelectItem>
                                    <SelectItem value="rejected">Reject</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label htmlFor="feedback">Feedback</Label>
                                <Textarea
                                  id="feedback"
                                  value={reviewData.feedback}
                                  onChange={(e) => setReviewData({...reviewData, feedback: e.target.value})}
                                  placeholder="Provide feedback to the mentee..."
                                  rows={4}
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <Button 
                                  onClick={() => handleReviewEvidence(evidence.id)}
                                  className="flex-1"
                                >
                                  Submit Review
                                </Button>
                                <Button variant="outline" onClick={() => setSelectedEvidence(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {evidence.file_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadFile(evidence.file_url, evidence.file_name || 'evidence')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View File
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {(evidence.status === 'approved' || evidence.status === 'rejected') && (
                      <div className="space-y-2">
                        {evidence.feedback && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-gray-700">Feedback:</p>
                            <p className="text-sm text-gray-600">{evidence.feedback}</p>
                          </div>
                        )}
                        
                        {evidence.file_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadFile(evidence.file_url, evidence.file_name || 'evidence')}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View File
                          </Button>
                        )}
                      </div>
                    )}
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
