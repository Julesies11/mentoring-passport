import { Fragment, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useUserPairs } from '@/hooks/use-pairs';
import { useAllEvidence } from '@/hooks/use-evidence';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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

export function MenteeEvidencePage() {
  const { user } = useAuth();
  const { data: pairs = [] } = useUserPairs(user?.id || '');
  const { evidence = [], isLoading } = useAllEvidence();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement evidence submission via hook
    console.log('Submit evidence:', formData);
    setIsCreateDialogOpen(false);
    setFormData({ type: 'photo', file_url: '', description: '', task_id: 'none' });
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Evidence"
            description="Submit and track your mentoring evidence"
          />
          <ToolbarActions>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <KeenIcon icon="plus" />
              Submit Evidence
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeenIcon icon="loading" className="animate-spin mb-2 text-2xl" />
              <p>Loading evidence...</p>
            </div>
          ) : (
            <Fragment>
              {/* Stats Section */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground mb-1 text-yellow-600">Pending Review</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-yellow-600">{pendingEvidence.length}</p>
                      <KeenIcon icon="time" className="text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground mb-1 text-success">Approved</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-success">{approvedEvidence.length}</p>
                      <KeenIcon icon="check-circle" className="text-success" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground mb-1 text-primary">Total Submitted</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-primary">{menteeEvidence.length}</p>
                      <KeenIcon icon="cloud-change" className="text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Evidence Grid */}
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-gray-900">Recent Evidence</h3>
                {menteeEvidence.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <KeenIcon icon="file-up" className="text-3xl text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Evidence Submitted</h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                        Start documenting your mentoring journey by submitting photos, documents, and other evidence of your progress.
                      </p>
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <KeenIcon icon="plus" />
                        Submit First Evidence
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7.5">
                    {menteeEvidence.map((item) => (
                      <Card key={item.id} className="overflow-hidden flex flex-col h-full">
                        <div className="aspect-video bg-gray-100 flex items-center justify-center relative group">
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
                            <Badge 
                              className={cn(
                                'capitalize border-none shadow-sm',
                                item.status === 'approved' && 'bg-success text-white',
                                item.status === 'rejected' && 'bg-danger text-white',
                                item.status === 'pending' && 'bg-yellow-500 text-white'
                              )}
                            >
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-5 flex-1 flex flex-col">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-xs font-medium text-muted-foreground">
                              {format(new Date(item.created_at), 'MMM d, yyyy')}
                            </span>
                            <div className="flex gap-1">
                              {item.type === 'photo' ? (
                                <KeenIcon icon="picture" className="text-muted-foreground text-sm" />
                              ) : (
                                <KeenIcon icon="document" className="text-muted-foreground text-sm" />
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                            {item.description || 'No description provided'}
                          </p>
                          
                          {item.task && (
                            <div className="flex items-center gap-1.5 mt-auto pt-4 border-t border-gray-100">
                              <KeenIcon icon="Check-list" className="text-gray-400 text-sm" />
                              <span className="text-xs text-muted-foreground truncate">
                                {item.task.name}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex gap-2 mt-4">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(item.file_url, '_blank')}>
                              <KeenIcon icon="eye" />
                              View
                            </Button>
                            {item.status === 'rejected' && (
                              <Button size="sm" variant="primary">
                                <KeenIcon icon="arrows-loop" />
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

              {/* Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle>Evidence Guidelines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-primary-light flex items-center justify-center text-primary">
                          <KeenIcon icon="picture" />
                        </div>
                        <h4 className="font-semibold text-gray-900">Photo Evidence</h4>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          Meeting photos with your mentor or team
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          Workshop or event participation snapshots
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          Project work or tangible accomplishments
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          Certificates or awards received
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-success-light flex items-center justify-center text-success">
                          <KeenIcon icon="document" />
                        </div>
                        <h4 className="font-semibold text-gray-900">Document Evidence</h4>
                      </div>
                      <ul className="text-sm text-gray-600 space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-success mt-1">•</span>
                          Meeting notes, summaries, and reflections
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-success mt-1">•</span>
                          Goal setting worksheets and plans
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-success mt-1">•</span>
                          Project documentation or research findings
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-success mt-1">•</span>
                          Written feedback and peer evaluations
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Fragment>
          )}
        </div>
      </Container>

      {/* Submit Evidence Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Submit New Evidence</DialogTitle>
            <DialogDescription>
              Upload evidence of your mentoring progress and accomplishments for review.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type" className="text-gray-900 font-semibold">Evidence Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as 'photo' | 'text' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select evidence type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo">Photo / Image</SelectItem>
                  <SelectItem value="text">Text Document</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="file_url" className="text-gray-900 font-semibold">File URL</Label>
              <Input
                id="file_url"
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="Enter file URL or upload path"
                required
              />
              <p className="text-xs text-muted-foreground">Upload functionality will be integrated with Supabase Storage.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-gray-900 font-semibold">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this evidence shows and why it's important"
                rows={3}
                className="resize-none"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task_id" className="text-gray-900 font-semibold">Related Task (Optional)</Label>
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
            <DialogFooter className="pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <KeenIcon icon="cloud-change" />
                Submit Evidence
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

