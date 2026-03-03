import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Container } from '@/components/common/container';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
} from '@/layouts/demo1/components/toolbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQueryClient } from '@tanstack/react-query';
import { getAvatarUrl } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ImageInput, type ImageInputFile } from '@/components/image-input';
import { KeenIcon } from '@/components/keenicons';
import { X } from 'lucide-react';

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  job_title: z.string().optional(),
  bio: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function EditProfilePage() {
  const { user, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [avatar, setAvatar] = useState<ImageInputFile[]>([]);
  const [deleteAvatar, setDeleteAvatar] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      job_title: user?.job_title || '',
      bio: user?.bio || '',
      department: user?.department || '',
      phone: user?.phone || '',
    },
  });

  useEffect(() => {
    if (user) {
      setValue('full_name', user.full_name || '');
      setValue('job_title', user.job_title || '');
      setValue('bio', user.bio || '');
      setValue('department', user.department || '');
      setValue('phone', user.phone || '');
      
      // Initialize avatar for ImageInput
      if (user.avatar_url) {
        setAvatar([{ dataURL: getAvatarUrl(user.id, user.avatar_url) }]);
      } else {
        setAvatar([]);
      }
      setDeleteAvatar(false);
    }
  }, [user, setValue]);

  const handleFormSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      let finalAvatarUrl: string | undefined = user.avatar_url;

      if (deleteAvatar) {
        finalAvatarUrl = undefined;
      } else if (avatar.length > 0 && avatar[0].file) {
        const file = avatar[0].file;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('mp-avatars')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;
        finalAvatarUrl = fileName;
      }

      await updateProfile({
        ...data,
        avatar_url: finalAvatarUrl,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      
      // Refresh local avatar state from new URL
      if (finalAvatarUrl) {
        setAvatar([{ dataURL: getAvatarUrl(user.id, finalAvatarUrl) }]);
      } else {
        setAvatar([]);
      }
      setDeleteAvatar(false);

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading
            title="Edit Profile"
            description="Manage your account settings and profile information"
          />
          <ToolbarActions>
            <Button variant="outline" onClick={() => reset()} disabled={isLoading}>
              <KeenIcon icon="arrows-loop" />
              Reset
            </Button>
            <Button onClick={handleSubmit(handleFormSubmit)} disabled={isLoading}>
              {isLoading ? (
                <><KeenIcon icon="loading" className="animate-spin mr-2" /> Saving...</>
              ) : (
                <><KeenIcon icon="check" /> Save Changes</>
              )}
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7.5">
          {/* Left Column - Avatar Section */}
          <div className="col-span-1">
            <Card>
              <CardHeader className="text-center pt-8">
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>
                  Your public profile image
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-8 flex flex-col items-center">
                <div className="relative group mb-6">
                  <ImageInput
                    value={avatar}
                    onChange={(selectedAvatar) => {
                      setAvatar(selectedAvatar);
                      setDeleteAvatar(selectedAvatar.length === 0);
                    }}
                  >
                    {({ onImageUpload }) => (
                      <div
                        className="size-32 relative cursor-pointer group rounded-full border-4 border-gray-100 group-hover:border-primary transition-all overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm p-0"
                        onClick={onImageUpload}
                      >
                        {avatar.length > 0 ? (
                          <img src={avatar[0].dataURL} alt="avatar" className="size-full object-cover" />
                        ) : (
                          <div className="text-gray-300 flex flex-col items-center">
                            <KeenIcon icon="user" className="text-5xl" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/40 py-2 text-[10px] text-white text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          Change Photo
                        </div>
                      </div>
                    )}
                  </ImageInput>
                  {avatar.length > 0 && (
                    <Button
                      variant="outline"
                      mode="icon"
                      className="size-8 absolute -top-1 -right-1 rounded-full bg-white shadow-md border-gray-200 text-gray-500 hover:text-danger hover:border-danger transition-colors z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAvatar([]);
                        setDeleteAvatar(true);
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 border-dashed w-full max-w-[240px]">
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                    Click the avatar to select a new photo. JPG, PNG or SVG are accepted.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Profile Information */}
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="grid gap-2">
                      <Label htmlFor="full_name" className="text-gray-900 font-semibold">Full Name *</Label>
                      <Input
                        id="full_name"
                        {...register('full_name')}
                        placeholder="e.g. John Doe"
                        className={errors.full_name ? 'border-danger' : ''}
                      />
                      {errors.full_name && (
                        <p className="text-xs text-danger font-medium">{errors.full_name.message}</p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="job_title" className="text-gray-900 font-semibold">Job Title</Label>
                      <Input
                        id="job_title"
                        {...register('job_title')}
                        placeholder="e.g. Senior Registrar"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="text-gray-900 font-semibold opacity-70">Email Address</Label>
                      <Input
                        id="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-gray-50 cursor-not-allowed border-gray-200"
                      />
                      <p className="text-[10px] text-muted-foreground italic">
                        Email is managed by administrator
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="bio" className="text-gray-900 font-semibold">Bio / Professional Summary</Label>
                    <Textarea
                      id="bio"
                      {...register('bio')}
                      placeholder="Tell us about your professional background..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="grid gap-2">
                      <Label htmlFor="department" className="text-gray-900 font-semibold">Department / Specialty</Label>
                      <Input
                        id="department"
                        {...register('department')}
                        placeholder="e.g., Surgery, Nursing"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="phone" className="text-gray-900 font-semibold">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        {...register('phone')}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-4 pt-6 border-t border-gray-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => reset()}
                      disabled={isLoading}
                    >
                      Discard Changes
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Profile Settings'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </Container>
    </>
  );
}
