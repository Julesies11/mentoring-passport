import { useState, useEffect } from 'react';
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
import { Eye, EyeOff } from 'lucide-react';
import { KeenIcon } from '@/components/keenicons';
import type { Organisation } from '@/lib/api/organisations';

const createOrganisationSchema = z.object({
  orgName: z.string().min(1, 'Organisation name is required'),
  supervisorEmail: z.string().email('Invalid email address'),
  supervisorPassword: z.string().min(8, 'Password must be at least 8 characters'),
  supervisorName: z.string().min(1, 'Supervisor name is required'),
});

const updateOrganisationSchema = z.object({
  name: z.string().min(1, 'Organisation name is required'),
});

interface OrganisationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisation?: Organisation | null;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export function OrganisationDialog({
  open,
  onOpenChange,
  organisation,
  onSubmit,
  isLoading,
}: OrganisationDialogProps) {
  const isEdit = !!organisation;
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<any>({
    resolver: zodResolver(isEdit ? updateOrganisationSchema : createOrganisationSchema),
    defaultValues: {
      orgName: '',
      supervisorEmail: '',
      supervisorPassword: '',
      supervisorName: '',
      name: '',
    },
  });

  useEffect(() => {
    if (open && organisation && isEdit) {
      reset({
        name: organisation.name,
      });
    } else if (open && !isEdit) {
      reset({
        orgName: '',
        supervisorEmail: '',
        supervisorPassword: '',
        supervisorName: '',
      });
    }
  }, [organisation, isEdit, reset, open]);

  const handleFormSubmit = async (data: any) => {
    try {
      setError(null);
      await onSubmit(data);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[500px] w-[calc(100%-32px)] sm:w-full max-h-[85dvh] p-0 overflow-hidden flex flex-col rounded-2xl border-none shadow-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-4 sm:p-6 pb-2 shrink-0 border-b border-gray-100">
          <DialogTitle className="text-lg sm:text-xl font-bold">{isEdit ? 'Edit Organisation' : 'Setup New Organisation'}</DialogTitle>
          <DialogDescription className="text-[10px] sm:text-xs uppercase font-bold text-gray-400 tracking-wider">
            {isEdit
              ? 'Update organisation details'
              : 'Create a new tenant and first supervisor'}
          </DialogDescription>
        </DialogHeader>

        <form 
          id="organisation-form"
          onSubmit={handleSubmit(handleFormSubmit)} 
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6"
        >
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <div className="grid gap-4">
            {isEdit ? (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Organisation Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g. Fiona Stanley Hospital"
                  className="h-10 sm:h-11 bg-gray-50 border-gray-100 rounded-xl font-bold"
                />
                {errors.name && (
                  <p className="text-[10px] text-red-600 font-medium ml-1">{(errors.name.message as string)}</p>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="orgName" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Organisation Name *</Label>
                  <Input
                    id="orgName"
                    {...register('orgName')}
                    placeholder="e.g. Fiona Stanley Hospital"
                    className="h-10 sm:h-11 bg-gray-50 border-gray-100 rounded-xl font-bold"
                  />
                  {errors.orgName && (
                    <p className="text-[10px] text-red-600 font-medium ml-1">{(errors.orgName.message as string)}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 mt-2">
                  <h4 className="text-[11px] font-black text-primary uppercase tracking-widest mb-4 ml-1">First Supervisor Details</h4>
                  
                  <div className="grid gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="supervisorName" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Full Name *</Label>
                      <Input
                        id="supervisorName"
                        {...register('supervisorName')}
                        placeholder="e.g. Jane Doe"
                        className="h-10 bg-gray-50 border-gray-100 rounded-xl font-bold"
                      />
                      {errors.supervisorName && (
                        <p className="text-[10px] text-red-600 font-medium ml-1">{(errors.supervisorName.message as string)}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="supervisorEmail" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address *</Label>
                      <Input
                        id="supervisorEmail"
                        type="email"
                        {...register('supervisorEmail')}
                        placeholder="jane@example.com"
                        className="h-10 bg-gray-50 border-gray-100 rounded-xl font-bold"
                      />
                      {errors.supervisorEmail && (
                        <p className="text-[10px] text-red-600 font-medium ml-1">{(errors.supervisorEmail.message as string)}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="supervisorPassword" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Initial Password *</Label>
                      <div className="relative">
                        <Input
                          id="supervisorPassword"
                          type={showPassword ? "text" : "password"}
                          {...register('supervisorPassword')}
                          placeholder="Min. 8 characters"
                          className="h-10 pr-10 bg-gray-50 border-gray-100 rounded-xl font-bold"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {errors.supervisorPassword && (
                        <p className="text-[10px] text-red-600 font-medium ml-1">{(errors.supervisorPassword.message as string)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </form>

        <DialogFooter className="p-4 sm:p-6 sm:py-4 border-t border-gray-100 shrink-0 bg-gray-50/50 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button type="button" variant="outline" onClick={handleClose} className="h-10 sm:h-11 px-6 font-bold rounded-xl w-full sm:w-auto order-2 sm:order-1 text-xs">
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="organisation-form"
            disabled={isLoading} 
            className="h-10 sm:h-11 px-8 font-bold shadow-lg shadow-primary/20 rounded-xl w-full sm:w-auto order-1 sm:order-2 text-xs"
          >
            {isLoading ? 'Processing...' : isEdit ? 'Update Organisation' : 'Setup Organisation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
