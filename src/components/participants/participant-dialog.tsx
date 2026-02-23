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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Eye, EyeOff, Camera } from 'lucide-react';
import type { Participant } from '@/lib/api/participants';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { ParticipantAvatarUpload } from './participant-avatar-upload';

const createParticipantSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['supervisor', 'mentor', 'mentee']),
  full_name: z.string().min(1, 'Name is required'),
  department: z.string().optional(),
  phone: z.string().optional(),
});

const updateParticipantSchema = z.object({
  role: z.enum(['supervisor', 'mentor', 'mentee']),
  full_name: z.string().min(1, 'Name is required'),
  department: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'archived']),
});

type CreateFormData = z.infer<typeof createParticipantSchema>;
type UpdateFormData = z.infer<typeof updateParticipantSchema>;

interface ParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant?: Participant | null;
  onSubmit: (data: CreateFormData | UpdateFormData) => Promise<void>;
  isLoading?: boolean;
}

export function ParticipantDialog({
  open,
  onOpenChange,
  participant,
  onSubmit,
  isLoading,
}: ParticipantDialogProps) {
  const isEdit = !!participant;
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(participant?.avatar_url || null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateFormData | UpdateFormData>({
    resolver: zodResolver(isEdit ? updateParticipantSchema : createParticipantSchema),
    defaultValues: isEdit
      ? {
          role: participant.role,
          full_name: participant.full_name || '',
          department: participant.department || '',
          bio: participant.bio || '',
          phone: participant.phone || '',
          status: participant.status,
        }
      : {
          email: '',
          password: '',
          role: 'mentee',
          full_name: '',
          department: '',
          phone: '',
        },
  });

  useEffect(() => {
    if (participant && isEdit) {
      setValue('role', participant.role);
      setValue('full_name', participant.full_name || '');
      setValue('department', participant.department || '');
      setValue('phone', participant.phone || '');
      if ('bio' in watch()) {
        setValue('bio', participant.bio || '');
      }
      if ('status' in watch()) {
        setValue('status', participant.status);
      }
    }
  }, [participant, isEdit, setValue, watch]);

  const handleFormSubmit = async (data: CreateFormData | UpdateFormData) => {
    try {
      setError(null);
      await onSubmit(data);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleAvatarChange = (newAvatarUrl: string | null) => {
    setAvatarUrl(newAvatarUrl);
  };

  const handleClose = () => {
    reset();
    setError(null);
    onOpenChange(false);
  };

  const roleValue = watch('role');

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Participant' : 'Add New Participant'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Update participant information'
                : 'Create a new participant account'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Avatar Section - Only for edit mode */}
            {isEdit && (
              <div className="flex items-center justify-center p-6 border-b">
                <div className="text-center">
                  <ProfileAvatar
                    userId={participant?.id || ''}
                    currentAvatar={avatarUrl}
                    userName={watch('full_name') || participant?.full_name || ''}
                    size="xl"
                    showEditButton={false}
                    className="ring-4 ring-gray-100 mb-4"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAvatarDialogOpen(true)}
                    className="mt-2"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Change Photo
                  </Button>
                </div>
              </div>
            )}

            {!isEdit && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="user@example.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register('password')}
                      placeholder="Minimum 8 characters"
                      className="pr-10"
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
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={roleValue}
                onValueChange={(value) => setValue('role', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="mentee">Mentee</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                {...register('full_name')}
                placeholder="John Doe"
              />
              {errors.full_name && (
                <p className="text-sm text-red-600">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                {...register('department')}
                placeholder="Emergency Medicine"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="+1234567890"
              />
            </div>

            {isEdit && 'bio' in watch() && (
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  {...register('bio')}
                  placeholder="Brief description..."
                  rows={3}
                />
              </div>
            )}

            {isEdit && 'status' in watch() && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {isEdit && participant && (
        <ParticipantAvatarUpload
          open={avatarDialogOpen}
          onOpenChange={setAvatarDialogOpen}
          participantId={participant.id}
          currentAvatar={avatarUrl}
          userName={watch('full_name') || participant.full_name}
          onAvatarChange={handleAvatarChange}
        />
      )}
    </>
  );
}
