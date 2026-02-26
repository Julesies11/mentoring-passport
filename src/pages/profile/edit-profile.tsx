import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { ParticipantAvatarUpload } from '@/components/participants/participant-avatar-upload';
import { useQueryClient } from '@tanstack/react-query';
import { updateProfile } from '@/lib/api/profiles';
import { toast } from 'sonner';
import { AvatarInput } from '@/partials/common/avatar-input';
import { ImageInputFile } from '@/components/image-input';
import { toAbsoluteUrl } from '@/lib/helpers';

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  bio: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function EditProfilePage() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || null);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFiles, setAvatarFiles] = useState<ImageInputFile[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      bio: user?.bio || '',
      department: user?.department || '',
      phone: user?.phone || '',
    },
  });

  useEffect(() => {
    if (user) {
      setValue('full_name', user.full_name || '');
      setValue('bio', user.bio || '');
      setValue('department', user.department || '');
      setValue('phone', user.phone || '');
      setAvatarUrl(user.avatar_url || null);
      
      // Initialize avatar files for Metronic AvatarInput
      if (user.avatar_url) {
        setAvatarFiles([{ 
          dataURL: `https://rdnaqrzqpcicskylmsyl.supabase.co/storage/v1/object/mp-avatars/${user.id}/${user.avatar_url}`
        }]);
      } else {
        setAvatarFiles([{ 
          dataURL: toAbsoluteUrl('/media/avatars/300-2.png')
        }]);
      }
    }
  }, [user, setValue]);

  const handleAvatarChange = (newAvatarUrl: string | null) => {
    setAvatarUrl(newAvatarUrl);
  };

  const handleAvatarFilesChange = (files: ImageInputFile[]) => {
    setAvatarFiles(files);
    // Extract the avatar URL from uploaded files
    if (files.length > 0 && files[0].dataURL) {
      // For now, we'll handle the actual upload in the form submit
      // This is just for preview
    }
  };

  const handleFormSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Handle avatar upload if new file was selected
      let finalAvatarUrl = avatarUrl;
      if (avatarFiles.length > 0 && avatarFiles[0].file) {
        // Upload new avatar - this would need to be implemented
        // For now, we'll keep the existing logic
        console.log('New avatar file selected:', avatarFiles[0].file);
      }

      await updateProfile(user.id, {
        ...data,
        avatar_url: finalAvatarUrl,
      });

      // Invalidate all user-related queries to refresh header avatar
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      
      // Update user context to refresh header avatar immediately
      if (updateUser) {
        updateUser({
          ...user,
          full_name: data.full_name,
          bio: data.bio,
          department: data.department,
          phone: data.phone,
          avatar_url: finalAvatarUrl,
        });
      }

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fixed py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-7.5">
        {/* Left Column - Avatar Section */}
        <div className="col-span-1">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>
                Upload or change your profile photo
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex justify-center mb-4">
                <AvatarInput 
                  value={avatarFiles}
                  onChange={handleAvatarFilesChange}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Click on the avatar to upload a new photo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Profile Information */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">

              {/* Profile Information */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    {...register('full_name')}
                    placeholder="Enter your full name"
                  />
                  {errors.full_name && (
                    <p className="text-sm text-red-600">{errors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact administrator if needed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    {...register('bio')}
                    placeholder="Tell us about yourself"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    {...register('department')}
                    placeholder="e.g., Emergency Medicine"
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
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => reset()}
                  disabled={isLoading}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
