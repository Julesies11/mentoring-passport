import { useState, useEffect, Fragment } from 'react';
import { CheckCircle, FileText, X, Trash2, Loader2, ImageIcon, CloudUpload, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { FileUpload } from '@/components/ui/file-upload';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPairEvidence, deleteEvidence, formatBytes } from '@/lib/api/evidence';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { KeenIcon } from '@/components/keenicons';

const statusLabels = {
  not_submitted: 'Not Started',
  awaiting_review: 'Awaiting Review',
  completed: 'Completed',
};

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    name: string;
    status: 'not_submitted' | 'awaiting_review' | 'completed' | 'revision_required';
    last_feedback?: string | null;
    description?: string;
    evidence_type?: {
      id?: string;
      name: string;
      requires_submission: boolean;
    };
    completed_at?: string;
  };
  pairId: string;
  onSubmitEvidence?: (
    taskId: string,
    evidence: { description: string; files: File[] },
    submitForReview: boolean
  ) => void;
  onUpdateStatus?: (
    taskId: string,
    status: 'not_submitted' | 'awaiting_review' | 'completed',
  ) => void;
  isSubmitting?: boolean;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  pairId,
  onSubmitEvidence,
  onUpdateStatus,
  isSubmitting = false,
}: TaskDialogProps) {
  const queryClient = useQueryClient();
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // 1. Fetch existing evidence
  const { data: dbEvidence = [], isLoading: isLoadingEvidence } = useQuery({
    queryKey: ['task-evidence', pairId, task.id],
    queryFn: () => fetchPairEvidence(pairId, task.id),
    enabled: open && !!pairId && !!task.id,
  });

  // 2. Deletion Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvidence(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-evidence', pairId, task.id] });
      queryClient.invalidateQueries({ queryKey: ['pair-evidence', pairId] });
      toast.success('File removed from server');
    }
  });

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setEvidenceDescription('');
      setSelectedFiles([]);
    }
  }, [open]);

  const handleAction = (submitForReview: boolean) => {
    const requiresSubmission = task.evidence_type?.requires_submission;
    if (submitForReview && requiresSubmission && selectedFiles.length === 0 && dbEvidence.length === 0) {
      toast.error('Evidence Required', { description: 'Please upload at least one file.' });
      return;
    }
    onSubmitEvidence?.(task.id, { description: evidenceDescription, files: selectedFiles }, submitForReview);
  };

  const isLocked = task.status === 'completed';
  const requiresSubmission = task.evidence_type?.requires_submission;

  // Unified File Item Component
  const FileItem = ({ name, size, type, url, onRemove, isDeleting = false, status }: any) => {
    const isImage = type?.startsWith('image/') || url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const [imgError, setImgError] = useState(false);
    
    const getIcon = () => {
      if (isImage) return <ImageIcon className="size-5 text-primary/40" />;
      if (type?.includes('pdf')) return <FileText className="size-5 text-danger/40" />;
      return <FileText className="size-5 text-gray-400" />;
    };

    return (
      <div className="flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm group hover:border-gray-300 transition-all">
        <div className="size-9 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
          {isImage && url && !imgError ? (
            <img src={url} alt={name} className="size-full object-cover" onError={() => setImgError(true)} />
          ) : getIcon()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-gray-900 truncate leading-none" title={name}>{name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] text-muted-foreground uppercase font-black">{formatBytes(size || 0)}</span>
            {status && (
              <Badge variant={status === 'approved' ? 'success' : 'warning'} size="xs" className="h-3 px-1 text-[7px] font-black uppercase">
                {status}
              </Badge>
            )}
          </div>
        </div>
        {!isLocked && (
          <button onClick={onRemove} disabled={isDeleting} className="size-7 flex items-center justify-center rounded-lg hover:bg-danger/5 text-gray-300 hover:text-danger transition-colors">
            {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-4" />}
          </button>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        {/* Compact Header */}
        <DialogHeader className="px-6 py-2.5 border-b border-gray-100 flex-shrink-0 bg-white mb-0">
          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">
              <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><FileText size={16} /></div>
              <div>
                <DialogTitle className="text-base font-bold text-gray-900 leading-none">{task.name}</DialogTitle>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Status:</span>
                    <Badge className={cn('h-4 px-1.5 rounded-full border-none font-black uppercase text-[7px]', 
                      task.status === 'completed' ? 'bg-green-100 text-green-700' : 
                      task.status === 'awaiting_review' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    )}>{statusLabels[task.status]}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 border-l border-gray-100 pl-3">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Requirement:</span>
                    <span className="text-[9px] font-bold text-gray-700">{task.evidence_type?.name || 'N/A'}</span>
                    {requiresSubmission && <Badge variant="danger" size="xs" className="h-3 text-[6px] font-black px-1">REQUIRED</Badge>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pt-0 pb-4 kt-scrollable-y-hover">
          {task.status === 'revision_required' && task.last_feedback && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-red-700">
                <KeenIcon icon="information-2" className="text-lg" />
                <span className="text-xs font-black uppercase tracking-widest">Revision Required</span>
              </div>
              <p className="text-sm text-red-800 leading-relaxed font-medium pl-7">
                "{task.last_feedback}"
              </p>
            </div>
          )}

          {!isLocked ? (
            <div className="space-y-2.5 pt-3">
              {/* Unified File List (Consistent Position Above) */}

              {(dbEvidence.length > 0 || selectedFiles.length > 0) && (
                <div className="space-y-1 animate-fade-in">
                  <Label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-1 mb-0">Uploaded Evidence ({dbEvidence.length + selectedFiles.length})</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {/* Database Files */}
                    {dbEvidence.map((e) => (
                      <FileItem key={e.id} name={e.file_name} size={e.file_size} type={e.mime_type} url={e.file_url} status={e.status}
                        onRemove={() => confirm('Delete permanently?') && deleteMutation.mutate(e.id)}
                        isDeleting={deleteMutation.isPending && deleteMutation.variables === e.id} />
                    ))}
                    {/* Newly Selected Files */}
                    {selectedFiles.map((file, i) => (
                      <FileItem key={i} name={file.name} size={file.size} type={file.type} url={URL.createObjectURL(file)}
                        onRemove={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))} />
                    ))}
                  </div>
                </div>
              )}

              {/* Dropzone */}
              <div className="pt-1">
                <FileUpload onFilesChange={setSelectedFiles} multiple={true} maxFiles={5} showFileList={false} className="py-0" />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label htmlFor="description" className="text-[9px] font-bold text-gray-500 uppercase tracking-widest px-1 mb-0">Notes / Description</Label>
                <Textarea value={evidenceDescription} onChange={(e) => setEvidenceDescription(e.target.value)} rows={2}
                  placeholder="Add details about your progress..." className="rounded-xl border-gray-200 resize-none p-2.5 bg-white text-sm shadow-sm min-h-[80px]" />
              </div>
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center justify-center text-center gap-4">
              <div className="size-20 rounded-full bg-success/10 flex items-center justify-center text-success"><CheckCircle size={48} /></div>
              <div className="space-y-1">
                <h4 className="text-2xl font-bold text-gray-900">Task Completed</h4>
                <p className="text-gray-500">Finalized on {task.completed_at ? format(new Date(task.completed_at), 'MMMM d, yyyy') : 'N/A'}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-10 px-6 font-bold text-xs">Cancel</Button>
          {!isLocked && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleAction(false)} disabled={isSubmitting} className="rounded-xl h-10 px-6 font-bold text-xs border-primary/20 text-primary hover:bg-primary/5">
                {isSubmitting ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button onClick={() => handleAction(true)} disabled={isSubmitting} className={cn("rounded-xl h-10 px-8 font-bold text-xs shadow-lg",
                requiresSubmission ? "shadow-primary/20" : "bg-success text-white shadow-success/20 hover:bg-success-dark")}>
                {isSubmitting ? 'Processing...' : 
                 task.status === 'revision_required' ? 'Resubmit for Review' :
                 requiresSubmission ? 'Submit for Review' : 'Mark as Completed'}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
