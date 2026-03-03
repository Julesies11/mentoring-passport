import React, { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KeenIcon } from '@/components/keenicons';
import { cn } from '@/lib/utils';

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  submitText?: string;
  submitDisabled?: boolean;
  submitIcon?: string;
  onDelete?: () => void;
  isDeleting?: boolean;
  deleteText?: string;
  readOnly?: boolean;
  maxWidth?: string;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  isSubmitting = false,
  submitText = 'Save Changes',
  submitDisabled = false,
  submitIcon = 'check',
  onDelete,
  isDeleting = false,
  deleteText = 'Delete',
  readOnly = false,
  maxWidth = 'max-w-[600px]',
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidth, "h-[85vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl")}>
        <DialogHeader className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-gray-900">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto kt-scrollable-y-hover px-6 py-6 space-y-8">
          {children}
        </div>

        {!readOnly && (
          <DialogFooter className={cn(
            "px-6 py-5 border-t border-gray-100 flex-shrink-0 bg-gray-50/30",
            onDelete ? "justify-between" : "justify-end"
          )}>
            {onDelete && (
              <Button
                variant="destructive"
                className="h-11 px-6 rounded-xl font-bold"
                onClick={onDelete}
                disabled={isDeleting || isSubmitting}
              >
                {isDeleting ? (
                  <KeenIcon icon="loading" className="animate-spin mr-2" />
                ) : (
                  <KeenIcon icon="trash" className="mr-2" />
                )}
                {deleteText}
              </Button>
            )}
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11 px-6 rounded-xl font-bold"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isDeleting}
              >
                Cancel
              </Button>
              {onSubmit && (
                <Button
                  className="h-11 px-8 rounded-xl font-bold shadow-lg shadow-primary/20"
                  onClick={onSubmit}
                  disabled={submitDisabled || isSubmitting || isDeleting}
                >
                  {isSubmitting ? (
                    <>
                      <KeenIcon icon="loading" className="animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <KeenIcon icon={submitIcon} className="mr-2" />
                      {submitText}
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
