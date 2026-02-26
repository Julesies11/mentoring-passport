import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { useAllEvidence } from '@/hooks/use-evidence';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image, FileText, Upload, Eye, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export function MenteeEvidencePage() {
  const { user } = useAuth();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const { evidence = [] } = useAllEvidence();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'photo',
    file_url: '',
    description: '',
    task_id: 'none'
  });

  // Filter evidence for mentee's pairs
  const menteeEvidence = evidence.filter(item => 
    pairs.some(pair => pair.id === item.pair_id) && item.submitted_by === user?.id
  );

  const pendingEvidence = menteeEvidence.filter(item => item.status === 'pending');
  const approvedEvidence = menteeEvidence.filter(item => item.status === 'approved');
  const rejectedEvidence = menteeEvidence.filter(item => item.status === 'rejected');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement evidence submission
    console.log('Submit evidence:', formData);
    setIsCreateDialogOpen(false);
    setFormData({ type: 'photo', file_url: '', description: '', task_id: 'none' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Evidence</h1>
            <p className="text-sm text-gray-600">Submit and track your mentoring evidence</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Submit Evidence
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit New Evidence</DialogTitle>
                <DialogDescription>
                  Upload evidence of your mentoring progress and accomplishments.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="type">Evidence Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value as 'photo' | 'text' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select evidence type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="photo">Photo/Image</SelectItem>
                      <SelectItem value="text">Text Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="file_url">File URL</Label>
                  <Input
                    id="file_url"
                    value={formData.file_url}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                    placeholder="Enter file URL or upload path"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this evidence shows and why it's important"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="task_id">Related Task (Optional)</Label>
                  <Select
                    value={formData.task_id}
                    onValueChange={(value) => setFormData({ ...formData, task_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select related task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific task</SelectItem>
                      {/* TODO: Add actual tasks from mentee's checklist */}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">Submit Evidence</Button>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-7.5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingEvidence.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting mentor review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedEvidence.length}</div>
              <p className="text-xs text-muted-foreground">Successfully verified</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submitted</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{menteeEvidence.length}</div>
              <p className="text-xs text-muted-foreground">All evidence items</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5 lg:gap-7.5">
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Evidence</h3>
            {menteeEvidence.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Upload className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Evidence Submitted</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Start documenting your mentoring journey by submitting photos, documents, and other evidence of your progress.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Submit First Evidence
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menteeEvidence.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      {item.type === 'photo' ? (
                        item.file_url ? (
                          <img 
                            src={item.file_url} 
                            alt={item.description}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Image className="h-12 w-12 text-gray-400" />
                        )
                      ) : (
                        <FileText className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          {getStatusBadge(item.status)}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-2 line-clamp-2">
                        {item.description || 'No description provided'}
                      </p>
                      {item.task && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Related to: {item.task.name}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {item.status === 'rejected' && (
                          <Button size="sm" variant="outline">
                            Resubmit
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Evidence Guidelines</CardTitle>
            <CardDescription>What makes good mentoring evidence</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium">Photo Evidence</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Meeting photos with your mentor</li>
                  <li>• Workshop or event participation</li>
                  <li>• Project work or accomplishments</li>
                  <li>• Certificates or achievements</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium">Document Evidence</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Meeting notes and reflections</li>
                  <li>• Goal setting worksheets</li>
                  <li>• Project documentation</li>
                  <li>• Feedback and evaluations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
