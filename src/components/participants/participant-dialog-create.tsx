import { useState, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, EyeOff, X } from 'lucide-react';
import { KeenIcon } from '@/components/keenicons';
import { ImageInput, type ImageInputFile } from '@/components/image-input';
import { toAbsoluteUrl } from '@/lib/helpers';
import type { CreateParticipantInput } from '@/lib/api/participants';

const createParticipantSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['supervisor', 'program-member']),
  full_name: z.string().min(1, 'Name is required'),
  job_title: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
});

type CreateFormData = z.infer<typeof createParticipantSchema>;

interface CreateParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateParticipantInput & { avatar_file?: File }) => Promise<void>;
  isLoading?: boolean;
}

export function CreateParticipantDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateParticipantDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState<ImageInputFile[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateFormData>({
    resolver: zodResolver(createParticipantSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'program-member',
      full_name: '',
      job_title: '',
      department: '',
      phone: '',
    },
  });

  const handleFormSubmit = async (data: CreateFormData) => {
    try {
      setError(null);
      // If there's an avatar, pass the file object
      const avatarFile = avatar.length > 0 && avatar[0].file ? avatar[0].file : undefined;
      await onSubmit({ ...data, avatar_file: avatarFile });
      reset();
      setAvatar([]);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleClose = () => {
    reset();
    setAvatar([]);
    setError(null);
    onOpenChange(false);
  };

  const roleValue = watch('role');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Participant</DialogTitle>
          <DialogDescription>
            Create a new participant account
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 pt-2" autoComplete="off">
          {/* Hidden fields to trick browser autocomplete */}
          <input type="text" name="email" style={{ display: 'none' }} aria-hidden="true" />
          <input type="password" name="password" style={{ display: 'none' }} aria-hidden="true" />
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <Label className="text-sm font-bold text-gray-700 uppercase tracking-wider self-start">Profile Picture</Label>
            <div className="relative group">
              <ImageInput
                value={avatar}
                onChange={(selectedAvatar) => setAvatar(selectedAvatar)}
              >
                {({ onImageUpload }) => (
                  <div
                    className="size-24 relative cursor-pointer group rounded-full border-2 border-gray-200 group-hover:border-primary transition-all overflow-hidden bg-gray-50 flex items-center justify-center p-0"
                    onClick={onImageUpload}
                  >
                    {avatar.length > 0 ? (
                      <img src={avatar[0].dataURL} alt="avatar" className="size-full object-cover" />
                    ) : (
                      <div className="text-gray-300 flex flex-col items-center">
                        <KeenIcon icon="user" className="text-3xl" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors" />
                    <div className="absolute bottom-0 inset-x-0 bg-black/40 py-1 text-[10px] text-white text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      Upload
                    </div>
                  </div>
                )}
              </ImageInput>
              {avatar.length > 0 && (
                <Button
                  variant="outline"
                  mode="icon"
                  className="size-6 absolute -top-1 -right-1 rounded-full bg-white shadow-md border-gray-200 text-gray-500 hover:text-danger hover:border-danger transition-colors z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvatar([]);
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground italic">Square image recommended, max 2MB</p>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold text-gray-600 uppercase">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="user@example.com"
                className="h-10 border-gray-200"
              />
              {errors.email && (
                <p className="text-xs text-red-600 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold text-gray-600 uppercase">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register('password')}
                  placeholder="Minimum 8 characters"
                  className="h-10 pr-10 border-gray-200"
                  autoComplete="new-password"
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
              {errors.password && (
                <p className="text-xs text-red-600 font-medium">{errors.password.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role" className="text-xs font-bold text-gray-600 uppercase">Role *</Label>
                <Select
                  value={roleValue}
                  onValueChange={(value) => setValue('role', value as any)}
                >
                  <SelectTrigger className="h-10 border-gray-200">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="program-member">Program Member</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-xs text-red-600 font-medium">{errors.role.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-xs font-bold text-gray-600 uppercase">Full Name *</Label>
                <Input
                  id="full_name"
                  {...register('full_name')}
                  placeholder="John Doe"
                  className="h-10 border-gray-200"
                />
                {errors.full_name && (
                  <p className="text-xs text-red-600 font-medium">{errors.full_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title" className="text-xs font-bold text-gray-600 uppercase">Job Title</Label>
              <Input
                id="job_title"
                {...register('job_title')}
                placeholder="Senior Registrar"
                className="h-10 border-gray-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department" className="text-xs font-bold text-gray-600 uppercase">Department</Label>
                <Input
                  id="department"
                  {...register('department')}
                  placeholder="Medicine"
                  className="h-10 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold text-gray-600 uppercase">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  placeholder="+1234567890"
                  className="h-10 border-gray-200"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="h-10 px-6 font-bold">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="h-10 px-8 font-bold shadow-lg shadow-primary/20">
              {isLoading ? 'Creating...' : 'Create Participant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
