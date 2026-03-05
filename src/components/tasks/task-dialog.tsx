import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    name: string;
    status: 'not_submitted' | 'awaiting_review' | 'completed' | 'revision_required';
    last_feedback?: string | null;
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (open) {
      setEvidenceNotes('');
      setSelectedFiles([]);
    }
  }, [open, task.status]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (submitForReview: boolean) => {
    await onSubmitEvidence(task.id, { description: evidenceNotes, files: selectedFiles }, submitForReview);
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
        <div className="flex flex-col h-full max-h-[85dvh]">
          {/* Header with Background Pattern */}
          <div className="bg-primary/5 p-5 sm:p-8 border-b border-primary/10 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                {['awaiting_review', 'completed'].includes(task.status) && (
                  <Badge variant="outline" className={cn("rounded-full font-black uppercase text-[10px] px-3 border-none shadow-sm", TASK_STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-700')}>
                    {statusLabels[task.status as keyof typeof statusLabels]}
                  </Badge>
                )}
                {requiresSubmission && (
                  <Badge variant="destructive" size="xs" className="h-4 text-[8px] font-black px-1.5 uppercase tracking-widest">
                    Evidence Required
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                {task.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Task details and evidence submission for {task.name}
              </DialogDescription>
            </div>
            {/* Decorative Icon */}
            <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] rotate-12">
              <KeenIcon icon="clipboard" className="text-[120px]" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto kt-scrollable-y-hover p-5 sm:p-8 space-y-6 sm:space-y-8">
            {/* Revision Feedback Section */}
            {task.status === 'revision_required' && task.last_feedback && (
              <section className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <KeenIcon icon="message-notif" className="text-danger" />
                  <span className="text-[10px] font-black uppercase text-danger tracking-widest">Feedback from Supervisor</span>
                </div>
                <div className="p-4 sm:p-5 rounded-2xl bg-red-50 border border-red-100 border-dashed">
                  <p className="text-sm text-red-800 leading-relaxed font-medium italic">
                    "{task.last_feedback}"
                  </p>
                </div>
              </section>
            )}

            {/* Evidence Submission Area */}
            {task.status !== 'completed' && (
              <section className="space-y-5 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 px-1">
                  <Upload size={16} className="text-primary" />
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Submit Progress</span>
                </div>

                <div className="space-y-4">
                  {/* Existing Evidence */}
                  {task.evidence && task.evidence.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <Label className="text-xs font-bold text-gray-600 uppercase px-1">Previously Uploaded Evidence</Label>
                      <div className="grid gap-2">
                        {task.evidence.map((evidence: any) => (
                          <div key={evidence.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                            {evidence.file_url ? (
                              <a 
                                href={evidence.file_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 min-w-0 flex-1 hover:text-primary transition-colors group"
                              >
                                <KeenIcon icon="file-done" className="text-success/60 group-hover:text-success text-base shrink-0" />
                                <span className="text-xs font-bold text-gray-700 group-hover:text-primary truncate">{evidence.file_name || 'View File'}</span>
                              </a>
                            ) : (
                              <div className="flex items-center gap-3 min-w-0 flex-1 text-gray-400">
                                <KeenIcon icon="file-deleted" className="text-gray-300 text-base shrink-0" />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold truncate line-through">{evidence.file_name || 'Unknown File'}</span>
                                  <span className="text-[9px] uppercase font-black tracking-widest text-danger">File Missing</span>
                                </div>
                              </div>
                            )}
                            {onDeleteEvidence && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                type="button"
                                className="size-8 rounded-lg text-gray-400 hover:text-danger hover:bg-danger/10 p-0" 
                                onClick={() => {
                                  if (confirm('Are you sure you want to remove this evidence file?')) {
                                    onDeleteEvidence(evidence.id);
                                  }
                                }}
                              >
                                <KeenIcon icon="trash" className="text-base" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-600 uppercase px-1">Notes / Reflections</Label>
                    <Textarea
                      placeholder="What progress have you made? Any reflections to share?"
                      value={evidenceNotes}
                      onChange={(e) => setEvidenceNotes(e.target.value)}
                      className="rounded-xl border-gray-200 resize-none p-3 sm:p-4 text-sm focus:border-primary transition-colors min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1">
                      <Label className="text-xs font-bold text-gray-600 uppercase">Upload Documents/Photos</Label>
                      {requiresSubmission && (
                        <span className="text-[9px] font-black text-danger uppercase tracking-tighter bg-danger/5 px-1.5 py-0.5 rounded border border-danger/10 w-fit">Required for Review</span>
                      )}
                    </div>
                    
                    {/* Dropzone Proxy */}
                    <div className="relative">
                      <input
                        type="file"
                        id="file-upload"
                        multiple
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                      />
                      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 sm:p-8 text-center hover:border-primary/50 hover:bg-primary/[0.02] transition-all bg-gray-50/50">
                        <div className="size-10 sm:size-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-3">
                          <Upload size={18} className="text-primary" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">Click or drag to upload</p>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-medium tracking-tighter">PDF, JPG, PNG, DOCX</p>
                      </div>
                    </div>

                    {/* File List */}
                    {selectedFiles.length > 0 && (
                      <div className="grid gap-2">
                        {selectedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 sm:p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText size={16} className="text-primary/60 shrink-0" />
                              <span className="text-xs font-bold text-gray-700 truncate">{file.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" mode="icon" className="size-7 rounded-lg text-gray-400 hover:text-danger" onClick={() => removeFile(idx)}>
                              <X size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Completed State Info */}
            {task.status === 'completed' && (
              <section className="flex flex-col items-center justify-center py-6 sm:py-10 text-center space-y-4">
                <div className="size-16 sm:size-20 rounded-full bg-success/10 flex items-center justify-center text-success mb-2">
                  <FileCheck size={32} className="sm:size-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Task Validated</h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1 px-4">
                    Completed on {task.completed_at ? format(new Date(task.completed_at), 'MMMM d, yyyy') : 'No date recorded'}
                  </p>
                </div>
              </section>
            )}
          </div>

          {/* Footer Actions */}
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
                    disabled={isSubmitting || (!evidenceNotes.trim() && selectedFiles.length === 0)}
                    className="rounded-xl h-10 sm:h-11 px-6 font-bold w-full sm:w-auto"
                  >
                    Save Draft
                  </Button>
                  <Button 
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary-dark text-white rounded-xl h-10 sm:h-11 px-8 font-bold shadow-lg shadow-primary/20 border-none w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <KeenIcon icon="loading" className="animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit for Review
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
                  Request Re-open
                </Button>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
