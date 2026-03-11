import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';
import { TASK_STATUS_COLORS } from '@/config/constants';
import { format } from 'date-fns';
import { 
  FileText, 
  Upload, 
  X, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { FilePreviewCard } from '@/components/common/file-preview-card';
import { useFileUpload } from '@/hooks/use-file-upload';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    name: string;
    status: 'not_submitted' | 'awaiting_review' | 'completed' | 'revision_required';
    last_feedback?: string | null;
    evidence_notes?: string | null;
    rejection_reason?: string | null;
    description?: string | null;
    evidence_type?: {
      id: string;
      name: string;
      requires_submission: boolean;
    } | null;
    completed_at?: string | null;
    evidence?: any[];
  };
  pairId: string;
  onSubmitEvidence: (taskId: string, evidence: { description: string; files: File[] }, submitForReview: boolean) => Promise<void>;
  onDeleteEvidence?: (evidenceId: string) => Promise<void>;
  onUpdateStatus: (taskId: string, currentStatus: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  onSubmitEvidence,
  onDeleteEvidence,
  onUpdateStatus,
  isSubmitting = false,
}: TaskDialogProps) {
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [submittingAction, setSubmittingAction] = useState<'draft' | 'review' | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [{ files, isDragging }, { addFiles, removeFile, clearFiles, getInputProps }] = useFileUpload({
    multiple: true,
    compress: true,
    compressionOptions: {
      maxSizeMB: 0.8,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    },
    onFilesChange: useCallback((newFiles: any[]) => {
      setHasChanges(newFiles.length > 0 || evidenceNotes !== (task.evidence_notes || ''));
    }, [evidenceNotes, task.evidence_notes]),
  });

  useEffect(() => {
    if (open) {
      setEvidenceNotes(task.evidence_notes || '');
      clearFiles();
      setSubmittingAction(null);
      setHasChanges(false);
    }
  }, [open, task.status, task.evidence_notes, clearFiles]);

  const handleSubmit = async (submitForReview: boolean) => {
    setSubmittingAction(submitForReview ? 'review' : 'draft');
    try {
      const actualFiles = files
        .map((f) => f.file)
        .filter((f) => f instanceof File) as File[];
      await onSubmitEvidence(task.id, { description: evidenceNotes, files: actualFiles }, submitForReview);
      setHasChanges(false);
    } finally {
      setSubmittingAction(null);
    }
  };

  const statusLabels = {
    not_submitted: 'Not Started',
    awaiting_review: 'In Review',
    completed: 'Completed',
    revision_required: 'Revision Requested',
  };

  const requiresSubmission = task.evidence_type?.requires_submission;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col h-full max-h-[85dvh] focus:outline-none bg-white">
          {/* Header */}
          <div className="bg-primary/5 p-5 sm:p-8 border-b border-primary/10 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                {['awaiting_review', 'completed', 'revision_required'].includes(task.status) && (
                  <Badge variant="outline" className={cn("rounded-full font-black uppercase text-[10px] px-3 border-none shadow-sm", TASK_STATUS_COLORS[task.status])}>
                    {statusLabels[task.status as keyof typeof statusLabels]}
                  </Badge>
                )}
                {requiresSubmission && (
                  <Badge variant="destructive" size="xs" className="h-4 text-[8px] font-black px-1.5 uppercase tracking-widest bg-red-500 text-white border-none shadow-xs">
                    Evidence Required
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                {task.name}
              </DialogTitle>
            </div>
            <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] rotate-12">
              <KeenIcon icon="clipboard" className="text-[120px]" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto kt-scrollable-y-hover p-5 sm:p-8 space-y-8">
            {/* 1. Task Description */}
            {task.description && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <KeenIcon icon="information-2" className="text-primary text-sm" />
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">About this Task</span>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-600 leading-relaxed">
                  {task.description}
                </div>
              </section>
            )}

            {/* 2. Feedback from Supervisor */}
            {(task.status === 'revision_required' && (task.rejection_reason || task.last_feedback)) && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <KeenIcon icon="message-notif" className="text-danger" />
                  <span className="text-[10px] font-black uppercase text-danger tracking-widest">Revision Requested</span>
                </div>
                <div className="p-5 rounded-xl bg-red-50 border border-red-100 relative group overflow-hidden">
                  <p className="text-sm text-red-900 leading-relaxed font-bold italic relative z-10">
                    "{task.rejection_reason || task.last_feedback || 'Please review your submission and make necessary changes.'}"
                  </p>
                </div>
              </section>
            )}

            {/* 3. Notes / Reflection */}
            {task.status !== 'completed' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <KeenIcon icon="message-text-2" className="text-primary" />
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Reflection & Progress</span>
                  </div>
                  {hasChanges && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[8px] h-4 px-1.5 uppercase font-black animate-pulse border-none">Unsaved</Badge>
                  )}
                </div>
                
                <Textarea
                  placeholder="What progress have you made? Share your key takeaways, challenges, or questions..."
                  value={evidenceNotes}
                  onChange={(e) => {
                    setEvidenceNotes(e.target.value);
                    setHasChanges(e.target.value !== (task.evidence_notes || '') || files.length > 0);
                  }}
                  className="rounded-xl border-gray-200 resize-none p-4 text-sm focus:border-primary transition-all min-h-[140px] bg-white shadow-xs"
                />
              </section>
            )}

            {/* 4. Evidence Upload */}
            {task.status !== 'completed' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <KeenIcon icon="cloud-upload" className="text-primary" />
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Supportive Evidence</span>
                  </div>
                  {requiresSubmission && (
                    <span className="text-[9px] font-black text-danger uppercase tracking-tighter bg-red-50 px-2 py-1 rounded-full border border-red-100 flex items-center gap-1">
                      <AlertCircle size={10} />
                      Required
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div 
                    className={cn(
                      "relative group border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center",
                      isDragging ? "border-primary bg-primary/[0.05]" : "border-gray-200 bg-gray-50/50 hover:border-primary/50 hover:bg-primary/[0.02]"
                    )}
                  >
                    <input
                      {...getInputProps()}
                      id="file-upload"
                      className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    />
                    <Upload size={24} className="text-primary mb-2" />
                    <p className="text-sm font-bold text-gray-900">Click or drag to upload files</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">PDF, IMAGES, DOCX</p>
                  </div>

                  {files.length > 0 && (
                    <div className="grid gap-2">
                      {files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText size={16} className="text-primary/60 shrink-0" />
                            <span className="text-xs font-bold text-gray-700 truncate">
                              {'name' in file.file ? file.file.name : 'Unknown file'}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            mode="icon" 
                            className="size-8 rounded-lg text-gray-400 hover:text-danger" 
                            onClick={() => removeFile(file.id)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {task.evidence && task.evidence.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Previously Shared</Label>
                      <div className="grid gap-2.5">
                        {task.evidence.map((evidence: any) => (
                          <FilePreviewCard
                            key={evidence.id}
                            fileName={evidence.file_name}
                            fileUrl={evidence.file_url}
                            mimeType={evidence.mime_type}
                            createdAt={evidence.created_at}
                            onDelete={onDeleteEvidence ? async () => {
                              if (confirm('Are you sure you want to remove this evidence?')) {
                                await onDeleteEvidence(evidence.id);
                                setHasChanges(true);
                              }
                            } : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Completed State */}
            {task.status === 'completed' && (
              <section className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                <div className="size-20 rounded-full bg-success/10 flex items-center justify-center text-success mb-2">
                  <FileCheck size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Task Successfully Validated</h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1 px-4 leading-relaxed">
                    Completed on {task.completed_at ? format(new Date(task.completed_at), 'MMMM d, yyyy') : 'an unrecorded date'}.
                  </p>
                </div>
              </section>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="p-5 sm:p-6 border-t border-gray-100 bg-gray-50/50 flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-10 sm:h-11 px-6 font-bold w-full sm:w-auto">
              Close
            </Button>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {task.status !== 'completed' && (
                <>
                  <Button 
                    variant="secondary" 
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting || !hasChanges}
                    className="rounded-xl h-10 sm:h-11 px-6 font-bold w-full sm:w-auto"
                  >
                    {submittingAction === 'draft' ? (
                      <>
                        <KeenIcon icon="loading" className="animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Draft'
                    )}
                  </Button>
                  <Button 
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting || (requiresSubmission && files.length === 0 && (!task.evidence || task.evidence.length === 0))}
                    className={cn(
                      "rounded-xl h-10 sm:h-11 px-8 font-bold border-none w-full sm:w-auto shadow-lg",
                      requiresSubmission && files.length === 0 && (!task.evidence || task.evidence.length === 0)
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                        : "bg-primary hover:bg-primary-dark text-white shadow-primary/20"
                    )}
                  >
                    {submittingAction === 'review' ? (
                      <>
                        <KeenIcon icon="loading" className="animate-spin mr-2" />
                        {requiresSubmission ? 'Submitting...' : 'Completing...'}
                      </>
                    ) : (
                      <>
                        {requiresSubmission ? 'Submit for Review' : 'Complete Task'}
                      </>
                    )}
                  </Button>
                </>
              )}
              {task.status === 'completed' && (
                <Button 
                  variant="outline"
                  onClick={() => onUpdateStatus(task.id, 'not_submitted')}
                  className="rounded-xl h-10 sm:h-11 px-6 font-bold text-gray-500 border-gray-200 w-full sm:w-auto"
                >
                  Request to Re-open
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
