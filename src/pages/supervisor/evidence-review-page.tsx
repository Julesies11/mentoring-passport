import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingEvidence } from '@/hooks/use-evidence';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
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
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FileText, ExternalLink, CheckCircle, XCircle, Clock, Paperclip } from 'lucide-react';

export function EvidenceReviewPage() {
  const navigate = useNavigate();
  const { evidence, stats, isLoading, reviewEvidence, isReviewing } = usePendingEvidence();
  
  // Review Dialog State
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');

  const handleOpenReview = (item: Evidence, action: 'approve' | 'reject') => {
    setSelectedEvidence(item);
    setReviewAction(action);
    setRejectionReason('');
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedEvidence) return;

    try {
      await reviewEvidence(selectedEvidence.id, {
        status: reviewAction === 'approve' ? 'approved' : 'rejected',
        rejection_reason: reviewAction === 'reject' ? rejectionReason : undefined,
      });
      
      toast.success(reviewAction === 'approve' ? 'Evidence approved' : 'Evidence rejected');
      setReviewDialogOpen(false);
      setSelectedEvidence(null);
    } catch (error) {
      toast.error('Failed to process review');
    }
  };

  const renderMediaPreview = (item: Evidence) => {
    const isImage = item.mime_type?.startsWith('image/') || 
                   item.file_url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

    if (isImage) {
      return (
        <div className="relative group rounded-xl overflow-hidden border border-gray-100 bg-gray-50 max-w-sm">
          <img 
            src={item.file_url || ''} 
            alt="Evidence" 
            className="w-full h-auto max-h-[300px] object-contain mx-auto"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            <Button 
              variant="secondary" 
              size="sm" 
              className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg shadow-lg h-8 text-[10px] font-bold"
              onClick={() => window.open(item.file_url || '', '_blank')}
            >
              <ExternalLink size={12} className="mr-1.5" />
              View Full Size
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 max-w-md group hover:border-primary/30 transition-colors cursor-pointer" onClick={() => window.open(item.file_url || '', '_blank')}>
        <div className="size-12 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm border border-gray-100 shrink-0">
          <FileText size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">{item.file_name || 'Document'}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{item.mime_type || 'File'}</p>
        </div>
        <div className="size-8 rounded-full flex items-center justify-center text-gray-300 group-hover:text-primary transition-colors">
          <ExternalLink size={16} />
        </div>
      </div>
    );
  };

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Evidence Review"
            description="Manage and validate program item submissions"
          />
          <ToolbarActions>
            {stats && (
              <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-col items-center border-r border-gray-100 pr-4">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Pending</span>
                  <span className="text-sm font-black text-danger">{stats.pending}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Reviewed</span>
                  <span className="text-sm font-black text-success">{stats.approved + stats.rejected}</span>
                </div>
              </div>
            )}
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <KeenIcon icon="loading" className="animate-spin text-3xl mb-3" />
            <span className="text-sm font-bold uppercase tracking-[0.2em]">Syncing Review Queue...</span>
          </div>
        ) : evidence.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200 bg-gray-50/30">
            <CardContent className="py-24 text-center">
              <div className="size-20 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4 text-gray-200">
                <CheckCircle size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Review Queue Cleared</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-2 font-medium">
                You've reviewed all pending evidence. New submissions will appear here automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {evidence.map((item) => (
              <Card key={item.id} className="border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12">
                  {/* Left Section: Info & Notes (7 cols) */}
                  <div className="lg:col-span-7 p-6 lg:p-8 space-y-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-3 shrink-0">
                          <div className="size-12 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-sm">
                            <ProfileAvatar 
                              userId={item.pair?.mentor?.id || ''} 
                              currentAvatar={item.pair?.mentor?.avatar_url} 
                              userName={item.pair?.mentor?.full_name || undefined} 
                              size="lg" 
                            />
                          </div>
                          <div className="size-12 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-sm">
                            <ProfileAvatar 
                              userId={item.pair?.mentee?.id || ''} 
                              currentAvatar={item.pair?.mentee?.avatar_url} 
                              userName={item.pair?.mentee?.full_name || undefined} 
                              size="lg" 
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black text-gray-900 leading-tight">
                              <span className="text-primary">{item.pair?.mentor?.full_name}</span>
                              <span className="text-gray-300 mx-2">&</span>
                              <span className="text-success">{item.pair?.mentee?.full_name}</span>
                            </h3>
                            <Badge 
                              className={cn(
                                "rounded-full font-black uppercase text-[8px] px-2 h-4 border-none",
                                item.status === 'pending' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                              )}
                            >
                              {item.status === 'rejected' ? 'Revision Required' : item.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
                              Submission for: <span className="text-gray-900 font-black">{item.task?.name || 'Assigned Task'}</span>
                            </p>
                            <button 
                              onClick={() => navigate(`/supervisor/checklist?pair=${item.pair_id}&taskId=${item.pair_task_id}`)}
                              className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1 ml-2 bg-primary/5 px-2 py-0.5 rounded"
                            >
                              <KeenIcon icon="exit-right-corner" className="text-[10px]" />
                              View Context
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center justify-end gap-1.5 text-gray-400">
                          <Clock size={12} />
                          <span className="text-[10px] font-black uppercase tracking-tight">{format(new Date(item.created_at), 'MMM d, yyyy • p')}</span>
                        </div>
                      </div>
                    </div>

                    {item.description && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <KeenIcon icon="message-text-2" className="text-gray-400 text-sm" />
                          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Submitter's Notes</span>
                        </div>
                        <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 italic text-gray-700 leading-relaxed text-sm">
                          "{item.description}"
                        </div>
                      </div>
                    )}

                    {(item.status === 'rejected' || item.rejection_reason) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <KeenIcon icon="information-2" className="text-danger text-sm" />
                          <span className="text-[10px] font-black uppercase text-danger tracking-widest">Your Previous Feedback</span>
                        </div>
                        <div className="p-5 rounded-2xl bg-red-50/50 border border-red-100 text-red-800 leading-relaxed text-sm font-medium">
                          "{item.rejection_reason || 'Changes requested.'}"
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-2">
                      <Button 
                        onClick={() => handleOpenReview(item, 'approve')}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 px-8 font-bold shadow-lg shadow-green-200 border-none"
                      >
                        <CheckCircle size={18} className="mr-2" />
                        Approve Submission
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleOpenReview(item, 'reject')}
                        className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl h-11 px-6 font-bold transition-colors"
                      >
                        <XCircle size={18} className="mr-2 text-red-600" />
                        Request Revision
                      </Button>
                    </div>
                  </div>

                  {/* Right Section: Media Preview (5 cols) */}
                  <div className="lg:col-span-5 bg-gray-50/50 border-t lg:border-t-0 lg:border-l border-gray-100 p-6 lg:p-8 flex flex-col">
                    <div className="flex items-center gap-2 mb-4 px-1">
                      <Paperclip size={14} className="text-gray-400" />
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Attached Evidence</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      {renderMediaPreview(item)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Container>

      {/* Review Action Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent 
          className="max-w-[500px] w-[calc(100%-32px)] sm:w-full p-0 overflow-hidden flex flex-col rounded-2xl border-none shadow-2xl max-h-[85dvh]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-4 sm:p-6 pb-0 shrink-0">
            <DialogTitle className="text-lg sm:text-xl font-bold">
              {reviewAction === 'approve' ? 'Confirm Approval' : 'Revision Required'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-gray-500">
              {reviewAction === 'approve'
                ? 'This will validate the evidence and mark the task as 100% completed.'
                : 'Provide specific feedback so the program member knows how to improve this submission.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto kt-scrollable-y-hover p-4 sm:p-6 pt-2">
            {reviewAction === 'reject' && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-600 uppercase tracking-widest">Supervisor Feedback *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain what needs to be changed..."
                  rows={5}
                  className="rounded-2xl border-gray-200 resize-none p-4 text-sm focus:border-danger transition-colors"
                />
              </div>
            )}
            
            {reviewAction === 'approve' && (
              <div className="p-4 sm:p-6 bg-success/5 border border-success/10 rounded-2xl flex flex-col items-center text-center gap-2 sm:gap-3">
                <div className="size-12 sm:size-14 rounded-full bg-success/10 flex items-center justify-center text-success">
                  <CheckCircle size={28} className="sm:size-32" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-gray-700">
                  Ready to validate this submission?
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 sm:p-6 sm:py-5 border-t border-gray-100 flex-shrink-0 bg-gray-50/30 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={isReviewing} className="rounded-xl h-10 sm:h-11 px-6 font-bold w-full sm:w-auto order-2 sm:order-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={isReviewing || (reviewAction === 'reject' && !rejectionReason.trim())}
              className={cn(
                "rounded-xl h-10 sm:h-11 px-8 font-bold shadow-lg w-full sm:w-auto order-1 sm:order-2",
                reviewAction === 'approve' ? "bg-green-600 hover:bg-green-700 text-white" : "bg-primary hover:bg-primary-dark text-white shadow-primary/20"
              )}
            >
              {isReviewing ? (
                <>
                  <KeenIcon icon="loading" className="animate-spin mr-1.5 sm:mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  {reviewAction === 'approve' ? 'Approve Now' : 'Send Feedback'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Label({ children, className, htmlFor }: { children: React.ReactNode, className?: string, htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>
      {children}
    </label>
  );
}
