import { Fragment, useState } from 'react';
import { usePendingEvidence } from '@/hooks/use-evidence';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KeenIcon } from '@/components/keenicons';
import type { Evidence } from '@/lib/api/evidence';

export function EvidenceReviewPage() {
  const { evidence, stats, isLoading, reviewEvidence, isReviewing } = usePendingEvidence();
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');

  const handleOpenReview = (evidence: Evidence, action: 'approve' | 'reject') => {
    setSelectedEvidence(evidence);
    setReviewAction(action);
    setRejectionReason('');
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedEvidence) return;

    await reviewEvidence(selectedEvidence.id, {
      status: reviewAction === 'approve' ? 'approved' : 'rejected',
      rejection_reason: reviewAction === 'reject' ? rejectionReason : undefined,
    });

    setReviewDialogOpen(false);
    setSelectedEvidence(null);
  };

  return (
    <Fragment>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Evidence Review"
            description="Review and approve evidence submissions from mentoring pairs"
          />
          <ToolbarActions>
            {/* Actions can be added here if needed */}
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
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground mb-1">Total Submissions</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground mb-1 text-yellow-600">Pending Review</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground mb-1 text-success">Approved</p>
                      <p className="text-2xl font-bold text-success">{stats.approved}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-sm text-muted-foreground mb-1 text-danger">Rejected</p>
                      <p className="text-2xl font-bold text-danger">{stats.rejected}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Evidence Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Pending Evidence</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {evidence.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <KeenIcon icon="file-done" className="text-4xl mb-2 opacity-20" />
                      <p>No pending evidence to review</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Pair</TableHead>
                            <TableHead>Task</TableHead>
                            <TableHead>Evidence Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {evidence.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-gray-900">
                                    {item.pair?.mentor?.full_name || 'Unknown'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    → {item.pair?.mentee?.full_name || 'Unknown'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{item.task?.name || 'Unknown Task'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {item.type || 'Unknown'}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate text-gray-600">
                                {item.description || '-'}
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {new Date(item.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => window.open(item.file_url, '_blank')}
                                  >
                                    <KeenIcon icon="eye" />
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-success hover:text-success-dark hover:bg-success-light"
                                    onClick={() => handleOpenReview(item, 'approve')}
                                  >
                                    <KeenIcon icon="check-circle" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-danger hover:text-danger-dark hover:bg-danger-light"
                                    onClick={() => handleOpenReview(item, 'reject')}
                                  >
                                    <KeenIcon icon="cross-circle" />
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Fragment>
          )}
        </div>
      </Container>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Evidence' : 'Reject Evidence'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve'
                ? 'Confirm that this evidence meets the requirements for the task.'
                : 'Please provide a reason for rejecting this evidence submission.'}
            </DialogDescription>
          </DialogHeader>

          {selectedEvidence && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Task</span>
                <p className="text-sm font-medium text-gray-900">
                  {selectedEvidence.task?.name}
                </p>
              </div>
              <div className="grid gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Evidence Type</span>
                <p className="text-sm text-gray-700 capitalize">
                  {selectedEvidence.type || 'Unknown'}
                </p>
              </div>
              {selectedEvidence.description && (
                <div className="grid gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Description</span>
                  <p className="text-sm text-gray-700">
                    {selectedEvidence.description}
                  </p>
                </div>
              )}

              {reviewAction === 'reject' && (
                <div className="grid gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Rejection Reason *</span>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this evidence is being rejected..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={isReviewing}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isReviewing || (reviewAction === 'reject' && !rejectionReason.trim())}
              className={reviewAction === 'approve' ? 'bg-success hover:bg-success-dark' : 'bg-danger hover:bg-danger-dark'}
            >
              {isReviewing ? (
                <Fragment>
                  <KeenIcon icon="loading" className="animate-spin mr-2" />
                  Processing...
                </Fragment>
              ) : (
                <Fragment>
                  {reviewAction === 'approve' ? 'Approve Evidence' : 'Reject Evidence'}
                </Fragment>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}

