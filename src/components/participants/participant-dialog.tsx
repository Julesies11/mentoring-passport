import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
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
import { Eye, EyeOff, X } from 'lucide-react';
import { KeenIcon } from '@/components/keenicons';
import { ImageInput, type ImageInputFile } from '@/components/image-input';
import { getAvatarUrl } from '@/lib/api/profiles';
import type { Participant } from '@/lib/api/participants';
import { cn } from '@/lib/utils';
import { useUserPairs } from '@/hooks/use-pairs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, getAvatarPublicUrl } from '@/lib/utils/avatar';

import { validateImage } from '@/lib/utils/image';

const createParticipantSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['administrator', 'org-admin', 'supervisor', 'program-member']),
  full_name: z.string().min(1, 'Name is required'),
  job_title: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
});

const updateParticipantSchema = z.object({
  role: z.enum(['administrator', 'org-admin', 'supervisor', 'program-member']),
  full_name: z.string().min(1, 'Name is required'),
  job_title: z.string().optional(),
  department: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'archived']),
});

interface ParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant?: Participant | null;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
  readOnly?: boolean;
}

export function ParticipantDialog({
  open,
  onOpenChange,
  participant,
  onSubmit,
  isLoading,
  readOnly = false,
}: ParticipantDialogProps) {
  const { role: currentUserRole } = useAuth();
  const isEdit = !!participant;
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [avatar, setAvatar] = useState<ImageInputFile[]>([]);
  const [deleteAvatar, setDeleteAvatar] = useState(false);

  const isSysAdmin = currentUserRole === 'administrator';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<any>({
    resolver: zodResolver((isEdit ? updateParticipantSchema : createParticipantSchema) as any),
    defaultValues: {
      role: 'program-member',
      email: '',
      password: '',
      full_name: '',
      job_title: '',
      department: '',
      phone: '',
      bio: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (open && participant && isEdit) {
      reset({
        role: participant.role,
        full_name: participant.full_name || '',
        job_title: participant.job_title || '',
        department: participant.department || '',
        phone: participant.phone || '',
        bio: participant.bio || '',
        status: participant.status,
      });

      // Initialize avatar if exists
      if (participant.avatar_url) {
        setAvatar([{ dataURL: getAvatarUrl(participant.id, participant.avatar_url) }]);
      } else {
        setAvatar([]);
      }
      setDeleteAvatar(false);
    } else if (open && !isEdit) {
      reset({
        email: '',
        password: '',
        role: 'program-member',
        full_name: '',
        job_title: '',
        department: '',
        phone: '',
        bio: '',
        status: 'active',
      });
      setAvatar([]);
      setDeleteAvatar(false);
    }
  }, [participant, isEdit, reset, open]);

  const handleFormSubmit = async (data: any) => {
    if (readOnly) return;
    try {
      setError(null);
      const avatarFile = avatar.length > 0 && avatar[0].file ? avatar[0].file : undefined;
      await onSubmit({ ...data, avatar_file: avatarFile, delete_avatar: deleteAvatar });
      reset();
      setAvatar([]);
      onOpenChange(false);
    } catch (err) {
      console.error('Error in handleFormSubmit:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleClose = () => {
    reset();
    setAvatar([]);
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
          <DialogTitle className="text-lg sm:text-xl font-bold">
            {readOnly ? 'User Profile' : isEdit ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogDescription className="text-[10px] sm:text-xs uppercase font-bold text-gray-400 tracking-wider">
            {readOnly 
              ? 'Viewing user details'
              : isEdit
                ? 'Update user information'
                : 'Create a new user account'}
          </DialogDescription>
        </DialogHeader>

        <form 
          id="participant-form"
          onSubmit={handleSubmit(handleFormSubmit)} 
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6"
        >
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3">
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest self-start">Profile Picture</Label>
            <div className="relative group">
              <ImageInput
                value={avatar}
                onChange={(selectedAvatar) => {
                  if (readOnly) return;
                  setError(null);
                  if (selectedAvatar.length > 0 && selectedAvatar[0].file) {
                    const validation = validateImage(selectedAvatar[0].file);
                    if (validation.error) {
                      setError(validation.error);
                      setAvatar([]);
                      return;
                    }
                  }
                  setAvatar(selectedAvatar);
                  setDeleteAvatar(selectedAvatar.length === 0);
                }}
                disabled={readOnly}
              >
                {({ onImageUpload }) => (
                  <div
                    className={cn(
                      "size-20 sm:size-24 relative group rounded-full border-2 border-gray-200 transition-all overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm p-0",
                      !readOnly && "cursor-pointer group-hover:border-primary"
                    )}
                    onClick={!readOnly ? onImageUpload : undefined}
                  >
                    {avatar.length > 0 ? (
                      <img src={avatar[0].dataURL} alt="avatar" className="size-full object-cover" />
                    ) : (
                      <div className="text-gray-300 flex flex-col items-center">
                        <KeenIcon icon="user" className="text-3xl" />
                      </div>
                    )}
                    {!readOnly && (
                      <>
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/40 py-1 text-[9px] text-white text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          Upload
                        </div>
                      </>
                    )}
                  </div>
                )}
              </ImageInput>
              {avatar.length > 0 && !readOnly && (
                <Button
                  variant="outline"
                  mode="icon"
                  className="size-6 absolute -top-1 -right-1 rounded-full bg-white shadow-md border-gray-200 text-gray-500 hover:text-danger hover:border-danger transition-colors z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvatar([]);
                    setDeleteAvatar(true);
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
            {!readOnly && <p className="text-[10px] text-muted-foreground italic text-center">Square image recommended, max 2MB</p>}
          </div>

          <div className="grid gap-4">
            {!isEdit && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="user@example.com"
                    className="h-9 sm:h-10 border-gray-200 text-sm"
                    disabled={readOnly}
                  />
                  {errors.email && (
                    <p className="text-[10px] text-red-600 font-medium">{(errors.email.message as string)}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...register('password')}
                      placeholder="Minimum 8 characters"
                      className="h-9 sm:h-10 pr-10 border-gray-200 text-sm"
                      disabled={readOnly}
                    />
                    {!readOnly && (
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
                    )}
                  </div>
                  {errors.password && (
                    <p className="text-[10px] text-red-600 font-medium">{(errors.password.message as string)}</p>
                  )}
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role *</Label>
                <Select
                  value={watch('role')}
                  onValueChange={(value) => setValue('role', value)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-9 sm:h-10 border-gray-200 text-sm">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSysAdmin && <SelectItem value="administrator">System Admin</SelectItem>}
                    {isSysAdmin && <SelectItem value="org-admin">Organisation Admin</SelectItem>}
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="program-member">Program Member</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-[10px] text-red-600 font-medium">{(errors.role.message as string)}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Full Name *</Label>
                <Input
                  id="full_name"
                  {...register('full_name')}
                  placeholder="John Doe"
                  className="h-9 sm:h-10 border-gray-200 text-sm"
                  disabled={readOnly}
                />
                {errors.full_name && (
                  <p className="text-[10px] text-red-600 font-medium">{(errors.full_name.message as string)}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job_title" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Job Title</Label>
              <Input
                id="job_title"
                {...register('job_title')}
                placeholder="Senior Registrar"
                className="h-9 sm:h-10 border-gray-200 text-sm"
                disabled={readOnly}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Department</Label>
                <Input
                  id="department"
                  {...register('department')}
                  placeholder="Medicine"
                  className="h-9 sm:h-10 border-gray-200 text-sm"
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  placeholder="+1234567890"
                  className="h-9 sm:h-10 border-gray-200 text-sm"
                  disabled={readOnly}
                />
              </div>
            </div>

            {isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Bio</Label>
                <Textarea
                  id="bio"
                  {...register('bio')}
                  placeholder={readOnly ? "No bio provided." : "Brief description..."}
                  rows={readOnly ? 5 : 2}
                  className={cn(
                    "border-gray-200 text-sm",
                    readOnly && "bg-gray-50/50 resize-none"
                  )}
                  disabled={readOnly}
                />
              </div>
            )}

            {readOnly && participant && (
              <PairingHistory userId={participant.id} />
            )}

            {isEdit && !readOnly && (
              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value)}
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-9 sm:h-10 border-gray-200 text-sm">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </form>

        <DialogFooter className="p-4 sm:p-6 sm:py-4 border-t border-gray-100 shrink-0 bg-gray-50/50 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button 
            type="button" 
            variant={readOnly ? "default" : "outline"} 
            onClick={handleClose} 
            className={cn(
              "h-10 sm:h-11 px-6 font-bold rounded-xl w-full sm:w-auto order-2 sm:order-1 text-xs",
              readOnly && "sm:order-2 bg-gray-900 text-white hover:bg-gray-800"
            )}
          >
            {readOnly ? 'Close Profile' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button 
              type="submit" 
              form="participant-form"
              disabled={isLoading} 
              className="h-10 sm:h-11 px-8 font-bold shadow-lg shadow-primary/20 rounded-xl w-full sm:w-auto order-1 sm:order-2 text-xs"
            >
              {isLoading ? 'Saving...' : isEdit ? 'Update Participant' : 'Create Participant'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PairingHistory({ userId }: { userId: string }) {
  const { data: pairings = [], isLoading } = useUserPairs(userId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <KeenIcon icon="loading" className="animate-spin text-primary" />
      </div>
    );
  }

  if (pairings.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Relationship History</Label>
        <p className="text-xs text-muted-foreground italic bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 text-center">
          No relationship history found across the organisation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Relationship History</Label>
      <div className="space-y-2">
        {pairings.map((pair) => {
          const isMentor = pair.mentor_id === userId;
          const partner = isMentor ? pair.mentee : pair.mentor;
          const partnerName = partner?.full_name || partner?.email || 'Unknown';
          const isActive = pair.status === 'active' && pair.program?.status === 'active';

          return (
            <div 
              key={pair.id} 
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border border-gray-100 transition-all",
                isActive ? "bg-primary/[0.02] border-primary/10 shadow-sm" : "bg-gray-50/50 grayscale-[0.5] opacity-80"
              )}
            >
              <Avatar className="size-8 shrink-0 border border-white shadow-sm">
                <AvatarImage src={getAvatarPublicUrl(partner?.avatar_url, partner?.id)} />
                <AvatarFallback className="text-[10px] font-bold">
                  {getInitials(partnerName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-bold text-gray-900 truncate">
                    {partnerName}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "rounded-full font-black uppercase text-[8px] px-2 h-4 border-none shrink-0",
                      isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                    )}
                  >
                    {isActive ? 'Active' : pair.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                  <span className="truncate">{pair.program?.name || 'Unknown Program'}</span>
                  <span className="shrink-0 size-1 bg-gray-300 rounded-full" />
                  <span className="shrink-0">{isMentor ? 'Mentor' : 'Mentee'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
