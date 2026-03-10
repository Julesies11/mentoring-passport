import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Program, CreateProgramInput, UpdateProgramInput } from '@/lib/api/programs';
import { KeenIcon } from '@/components/keenicons';
import { Switch } from '@/components/ui/switch';

const programSchema = z.object({
  name: z.string().min(1, 'Program name is required'),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

type ProgramFormData = z.infer<typeof programSchema>;

interface ProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  program?: Program;
  isLoading?: boolean;
}

export function ProgramDialog({
  open,
  onOpenChange,
  onSubmit,
  program,
  isLoading,
}: ProgramDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: '',
      start_date: '',
      end_date: '',
      isActive: true,
    },
  });

  const isActive = watch('isActive');

  useEffect(() => {
    if (open) {
      if (program) {
        reset({
          name: program.name,
          start_date: program.start_date || '',
          end_date: program.end_date || '',
          isActive: program.status === 'active',
        });
      } else {
        reset({
          name: '',
          start_date: '',
          end_date: '',
          isActive: true,
        });
      }
    }
  }, [open, program, reset]);

  const handleFormSubmit = async (data: ProgramFormData) => {
    const { isActive, ...rest } = data;
    await onSubmit({
      ...rest,
      status: isActive ? 'active' : 'inactive'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{program ? 'Edit Program' : 'Add New Program'}</DialogTitle>
          <DialogDescription>
            {program 
              ? 'Update the mentoring program details' 
              : 'Create a new mentoring program for your organisation'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Program Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g. 2025 Residency Program"
              className={errors.name ? 'border-danger' : ''}
            />
            {errors.name && (
              <p className="text-xs text-danger font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="status-toggle" className="font-bold">Program Status</Label>
              <p className="text-[10px] text-muted-foreground">
                {isActive ? 'This program is currently active' : 'This program is currently inactive'}
              </p>
            </div>
            <Switch
              id="status-toggle"
              checked={isActive}
              onCheckedChange={(checked) => setValue('isActive', checked)}
            />
          </div>

          <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <><KeenIcon icon="loading" className="animate-spin mr-2" /> Saving...</>
              ) : (
                program ? 'Update Program' : 'Create Program'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
