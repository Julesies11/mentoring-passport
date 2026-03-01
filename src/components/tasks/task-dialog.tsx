import { useState, useRef } from 'react';
import { CheckCircle, FileText, Upload, X, Camera, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { KeenIcon } from '@/components/keenicons';

const statusColors = {
  not_submitted: 'text-gray-400',
  awaiting_review: 'text-yellow-500',
  completed: 'text-green-500',
};

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
    status: 'not_submitted' | 'awaiting_review' | 'completed';
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
    evidence: { description: string; file?: File },
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
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleSubmit = () => {
    // Check if evidence submission is required
    const requiresSubmission = task.evidence_type?.requires_submission;

    // Validate description
    if (!evidenceDescription.trim()) {
      alert('Please provide a description for your evidence.');
      return;
    }

    // Validate file upload if required
    if (requiresSubmission && !selectedFile) {
      alert('This task requires evidence submission. Please upload a file.');
      return;
    }

    onSubmitEvidence?.(task.id, {
      description: evidenceDescription,
      file: selectedFile || undefined,
    });

    // Reset form will be handled by parent or on success
  };

  const canSubmit =
    task.status === 'not_submitted' || task.status === 'awaiting_review';
  const isCompleted = task.status === 'completed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {task.name}
          </DialogTitle>
          <DialogDescription>
            Submit evidence and track progress for this task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Current Status</p>
              <Badge
                className={cn(
                  'mt-1',
                  task.status === 'completed' && 'bg-green-100 text-green-800',
                  task.status === 'awaiting_review' &&
                    'bg-yellow-100 text-yellow-800',
                  task.status === 'not_submitted' &&
                    'bg-gray-100 text-gray-800',
                )}
              >
                {statusLabels[task.status]}
              </Badge>
            </div>

            {task.evidence_type && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Evidence Type</p>
                <p className="text-sm font-medium">{task.evidence_type.name}</p>
              </div>
            )}
          </div>

          {/* Evidence Submission */}
          {!isCompleted && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Submit Evidence</Label>
                {task.evidence_type?.requires_submission && (
                  <Badge variant="destructive" className="text-xs">
                    Required
                  </Badge>
                )}
              </div>

              {/* File Upload */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25',
                  selectedFile && 'border-primary bg-primary/5',
                )}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="space-y-3">
                    {previewUrl ? (
                      <div className="relative mx-auto w-32 h-32 rounded-lg overflow-hidden border">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <FileText className="w-12 h-12 mx-auto text-primary" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-gray-900 truncate max-w-[200px] mx-auto">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger hover:bg-danger/5 h-8"
                      onClick={handleRemoveFile}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-12 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 mb-2">
                        <Upload className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-bold text-gray-900">
                        Upload your evidence
                      </p>
                      <p className="text-xs text-muted-foreground max-w-[240px]">
                        Drag and drop a file here, or use the buttons below
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                      <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                      />
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={cameraInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                      />
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-white hover:bg-gray-50 gap-2 h-10 px-4"
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera className="w-4 h-4" />
                        Take Photo
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-white hover:bg-gray-50 gap-2 h-10 px-4"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImageIcon className="w-4 h-4" />
                        Select Image
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-white hover:bg-gray-50 gap-2 h-10 px-4"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = "*/*";
                            fileInputRef.current.click();
                          }
                        }}
                      >
                        <FileText className="w-4 h-4" />
                        Any File
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your evidence and how it demonstrates completion of this task..."
                  value={evidenceDescription}
                  onChange={(e) => setEvidenceDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Completed Evidence */}
          {isCompleted && task.completed_at && (
            <div className="space-y-4">
              <Label className="text-base font-medium">
                Submitted Evidence
              </Label>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-800">
                    Completed
                  </p>
                </div>
                <p className="text-sm text-green-700">
                  This task was completed on{' '}
                  {new Date(task.completed_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Status Actions */}
          {onUpdateStatus && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Update Status</Label>
              <div className="flex gap-2">
                {task.status !== 'not_submitted' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateStatus(task.id, 'not_submitted')}
                  >
                    Mark as Not Started
                  </Button>
                )}
                {task.status !== 'awaiting_review' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateStatus(task.id, 'awaiting_review')}
                  >
                    Mark as Awaiting Review
                  </Button>
                )}
                {task.status !== 'completed' && (
                  <Button
                    size="sm"
                    onClick={() => onUpdateStatus(task.id, 'completed')}
                  >
                    Mark as Completed
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canSubmit && onSubmitEvidence && (
            <Button
              onClick={handleSubmit}
              disabled={!evidenceDescription.trim() || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Evidence'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
