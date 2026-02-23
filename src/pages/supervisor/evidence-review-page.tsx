import { useState } from 'react';
import { usePendingEvidence } from '@/hooks/use-evidence';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="container-fixed">
        <div className="text-center py-12 text-muted-foreground">
          Loading evidence...
        </div>
      </div>
    );
  }

  return (
    <div className="container-fixed">
      <div className="flex flex-col gap-5 lg:gap-7.5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Evidence Review</h1>
          <p className="text-sm text-gray-600 mt-1">
            Review and approve evidence submissions from mentoring pairs
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Total Submissions</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-muted-foreground mb-1">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Pending Evidence</h3>
          </div>
          <div className="card-body p-0">
            {evidence.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pending evidence to review
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
                            <span className="font-medium">
                              {item.pair?.mentor?.full_name || 'Unknown'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              → {item.pair?.mentee?.full_name || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{item.task?.name || 'Unknown Task'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.evidence_type?.name || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.description || '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(item.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(item.file_url, '_blank')}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleOpenReview(item, 'approve')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleOpenReview(item, 'reject')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
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
          </div>
        </div>
      </div>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Evidence' : 'Reject Evidence'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve'
                ? 'Confirm that this evidence meets the requirements.'
                : 'Provide a reason for rejecting this evidence.'}
            </DialogDescription>
          </DialogHeader>

          {selectedEvidence && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Task</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEvidence.task?.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Evidence Type</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEvidence.evidence_type?.name}
                </p>
              </div>
              {selectedEvidence.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvidence.description}
                  </p>
                </div>
              )}

              {reviewAction === 'reject' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Rejection Reason *
                  </label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this evidence is being rejected..."
                    rows={4}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isReviewing || (reviewAction === 'reject' && !rejectionReason.trim())}
              className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isReviewing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {reviewAction === 'approve' ? 'Approve' : 'Reject'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
