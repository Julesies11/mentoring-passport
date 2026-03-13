import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAllEvidence, usePendingEvidence } from '@/hooks/use-evidence';
import { useAuth } from '@/auth/context/auth-context';
import { useOrganisation } from '@/providers/organisation-provider';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeenIcon } from '@/components/keenicons';
import type { Evidence } from '@/lib/api/evidence';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, History, ListFilter } from 'lucide-react';
import { usePagination } from '@/hooks/use-pagination';
import { DataTablePagination } from '@/components/common/data-table-pagination';
import { FilePreviewCard } from '@/components/common/file-preview-card';
import { ProgramSelector } from '@/components/common/program-selector';

export function EvidenceReviewPage() {
  const navigate = useNavigate();
  const { isOrgAdmin } = useAuth();
  const { activeProgram, isLoading: isContextLoading } = useOrganisation();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightPairId = searchParams.get('pairId');
  const { data: allEvidence = [], isLoading } = useAllEvidence();
  const { stats, reviewEvidence, isReviewing } = usePendingEvidence();
  const [statusFilter, setStatusFilter] = useState<'to_review' | 'reviewed' | 'all'>('to_review');
  
  const filteredEvidence = useMemo(() => {
    let items = allEvidence;
    if (statusFilter === 'to_review') {
      items = allEvidence.filter(e => e.status === 'pending' || e.status === 'rejected');
    } else if (statusFilter === 'reviewed') {
      items = allEvidence.filter(e => e.status === 'approved');
    }

    if (highlightPairId) {
      items = items.filter(e => e.pair_id === highlightPairId);
    }
    return items;
  }, [allEvidence, statusFilter, highlightPairId]);

  const clearPairFilter = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('pairId');
    setSearchParams(newParams);
  };

  // Use centralized pagination hook
  const {
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedItems,
    goToNextPage,
    goToPrevPage,
    totalItems,
    startIndex,
    endIndex
  } = usePagination({
    items: filteredEvidence,
    initialItemsPerPage: 10,
    resetDeps: [statusFilter]
  });

  // Review Dialog State
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');

  const handleOpenReview = (item: Evidence, action: 'approve' | 'reject') => {
    setSelectedEvidence(item);
    setReviewAction(action);
    setRejectionReason(item.task?.rejection_reason || '');
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
    } catch (_error) {
      console.error('Failed to process review:', _error);
      toast.error('Failed to process review');
    }
  };

  if (isContextLoading) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
          <KeenIcon icon="loading" className="animate-spin text-3xl mb-4" />
          <p className="font-bold uppercase text-[10px] tracking-widest">Loading program data...</p>
        </div>
      </Container>
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Container>
          <Toolbar>
            <div className="flex items-center gap-5">
              <ToolbarHeading
                title="Evidence Review"
                description={highlightPairId ? "Reviewing evidence for selected pair" : "Manage and validate program item submissions"}
              />
              <ProgramSelector />
            </div>
            <ToolbarActions>
              {/* Toolbar Actions remain empty here as minor filters are in the content area */}
            </ToolbarActions>
          </Toolbar>
        </Container>
      </div>

      <Container className="sm:mt-0">
        <div className="flex flex-col gap-5 lg:gap-7.5">
          {/* Content Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 p-2 sm:p-3 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="w-[160px] h-9 rounded-lg font-bold bg-white border-gray-200 text-xs">
                  <div className="flex items-center gap-2">
                    <ListFilter size={14} className="text-gray-400" />
                    <SelectValue placeholder="Filter View" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100 shadow-2xl">
                  <SelectItem value="to_review" className="font-bold py-2.5">To Review</SelectItem>
                  <SelectItem value="reviewed" className="font-bold py-2.5">Review History</SelectItem>
                  <SelectItem value="all" className="font-bold py-2.5">All Submissions</SelectItem>
                </SelectContent>
              </Select>

              {highlightPairId && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearPairFilter}
                  className="h-9 rounded-lg font-bold border-primary text-primary hover:bg-primary/5 text-xs"
                >
                  <KeenIcon icon="cross" className="mr-1.5" />
                  Clear Filter
                </Button>
              )}
            </div>

            {stats && (
              <div className="flex items-center gap-4 bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex flex-col items-center border-r border-gray-100 pr-4">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Pending</span>
                  <span className="text-xs font-black text-danger leading-none">{stats.pending}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Reviewed</span>
                  <span className="text-xs font-black text-success leading-none">{stats.approved + stats.rejected}</span>
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <KeenIcon icon="loading" className="animate-spin text-3xl mb-3" />
            <span className="text-sm font-bold uppercase tracking-[0.2em]">Syncing Review Queue...</span>
          </div>
        ) : filteredEvidence.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200 bg-gray-50/30">
            <CardContent className="py-24 text-center">
              <div className="size-20 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4 text-gray-200">
                {statusFilter === 'reviewed' ? <History size={40} /> : <CheckCircle size={40} />}
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {statusFilter === 'reviewed' ? 'No History Found' : 'Review Queue Cleared'}
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-2 font-medium">
                {statusFilter === 'reviewed' 
                  ? "You haven't approved any submissions yet. Once you do, they will appear here."
                  : "You've reviewed all pending evidence. New submissions will appear here automatically."}
              </p>
              {statusFilter !== 'all' && (
                <Button variant="link" onClick={() => setStatusFilter('all')} className="mt-4 text-primary font-bold">
                  View All Submissions
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6">
              {paginatedItems.map((item) => (
                <Card key={item.id} className={cn(
                  "border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden",
                  item.status === 'approved' && "opacity-80 border-gray-100"
                )}>
                  <div className="grid grid-cols-1 lg:grid-cols-12">
                    {/* Left Section: Info & Notes (7 cols) */}
                    <div className="lg:col-span-7 p-6 lg:p-8 space-y-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4 min-w-0">
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
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-black text-gray-900 leading-tight truncate">
                                <span className="text-primary">{item.pair?.mentor?.full_name}</span>
                                <span className="text-gray-300 mx-2">&</span>
                                <span className="text-success">{item.pair?.mentee?.full_name}</span>
                              </h3>
                              <Badge 
                                className={cn(
                                  "rounded-full font-black uppercase text-[8px] px-2 h-4 border-none",
                                  item.status === 'pending' ? "bg-amber-100 text-amber-700" : 
                                  item.status === 'approved' ? "bg-success-light text-success" :
                                  "bg-red-100 text-red-700"
                                )}
                              >
                                {item.status === 'rejected' ? 'Revision Required' : item.status}
                              </Badge>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter truncate">
                                Submission for: <span className="text-gray-900 font-black">{item.task?.name || 'Assigned Task'}</span>
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="hidden sm:inline text-gray-300">•</span>
                                <span className="sm:hidden text-[10px] text-gray-400 font-bold uppercase">{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                                <button 
                                  onClick={() => navigate(`/supervisor/checklist?pair=${item.pair_id}&taskId=${item.pair_task_id}`)}
                                  className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded shrink-0"
                                >
                                  <KeenIcon icon="exit-right-corner" className="text-[10px]" />
                                  View Context
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right hidden sm:block shrink-0">
                          <div className="flex items-center justify-end gap-1.5 text-gray-400">
                            <Clock size={12} />
                            <span className="text-[10px] font-black uppercase tracking-tight">{format(new Date(item.created_at), 'MMM d, yyyy • p')}</span>
                          </div>
                        </div>
                      </div>

                      {(item.description || item.task?.evidence_notes) && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 px-1">
                            <KeenIcon icon="message-text-2" className="text-gray-400 text-sm" />
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Submitter's Notes</span>
                          </div>
                          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 italic text-gray-700 leading-relaxed text-sm">
                            "{item.task?.evidence_notes || item.description}"
                          </div>
                        </div>
                      )}

                      {(item.status === 'rejected' || item.rejection_reason || item.task?.rejection_reason) && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 px-1">
                            <KeenIcon icon="information-2" className="text-danger text-sm" />
                            <span className="text-[10px] font-black uppercase text-danger tracking-widest">Supervisor Feedback</span>
                          </div>
                          <div className="p-5 rounded-2xl bg-red-50/50 border border-red-100 text-red-800 leading-relaxed text-sm font-medium">
                            "{item.task?.rejection_reason || item.rejection_reason || 'Changes requested.'}"
                          </div>
                        </div>
                      )}

                      {item.status !== 'approved' && (
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
                      )}

                      {item.status === 'approved' && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 pt-2">
                          <div className="flex items-center gap-2 px-1 text-success">
                            <CheckCircle size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">Validated Submission</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 border-l border-gray-100 sm:pl-6">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Submitted</span>
                              <span className="text-[11px] font-bold text-gray-600">{format(new Date(item.created_at), 'MMM d, yyyy • p')}</span>
                            </div>
                            {item.reviewed_at && (
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Reviewed</span>
                                <span className="text-[11px] font-bold text-gray-600">{format(new Date(item.reviewed_at), 'MMM d, yyyy • p')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Section: Media Preview (5 cols) */}
                    <div className="lg:col-span-5 bg-gray-50/50 border-t lg:border-t-0 lg:border-l border-gray-100 p-6 lg:p-8 flex flex-col min-w-0">
                      <div className="flex items-center gap-2 mb-4 px-1">
                        <KeenIcon icon="folder" className="text-gray-400 text-sm" />
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                          {item.file_url || (item.all_files && item.all_files.length > 0) ? 'Attached Evidence' : 'Reflection Details'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {item.all_files && item.all_files.length > 0 ? (
                          <div className="flex flex-col gap-3 w-full">
                            {item.all_files.map((file) => (
                              <FilePreviewCard 
                                key={file.id}
                                fileName={file.file_name}
                                fileUrl={file.file_url}
                                mimeType={file.mime_type}
                                createdAt={file.created_at}
                                className="w-full"
                              />
                            ))}
                          </div>
                        ) : item.file_url ? (
                          <FilePreviewCard 
                            fileName={item.file_name}
                            fileUrl={item.file_url}
                            mimeType={item.mime_type}
                            createdAt={item.created_at}
                            className="w-full"
                          />
                        ) : (
                          <div className="w-full h-full min-h-[200px] p-6 sm:p-8 rounded-3xl bg-primary/[0.03] border border-primary/10 border-dashed flex flex-col items-center justify-center text-center gap-4">
                            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                              <KeenIcon icon="message-text-2" className="text-3xl" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Written Submission</p>
                              <p className="text-sm text-gray-800 font-medium leading-relaxed italic line-clamp-6">
                                "{item.task?.evidence_notes || item.description || 'No additional notes provided.'}"
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="border-gray-200 shadow-none">
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                startIndex={startIndex}
                endIndex={endIndex}
                onItemsPerPageChange={setItemsPerPage}
                onPrevPage={goToPrevPage}
                onNextPage={goToNextPage}
              />
            </Card>
          </div>
        )}
        </div>
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
