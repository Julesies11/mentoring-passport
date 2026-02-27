import { Fragment, useState, useEffect } from 'react';
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
import { updateProfile } from '@/lib/api/profiles';
import { toast } from 'sonner';
import { AvatarInput } from '@/partials/common/avatar-input';
import { ImageInputFile } from '@/components/image-input';
import { toAbsoluteUrl } from '@/lib/helpers';
import { KeenIcon } from '@/components/keenicons';

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
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFiles, setAvatarFiles] = useState<ImageInputFile[]>([]);

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

  const handleAvatarFilesChange = (files: ImageInputFile[]) => {
    setAvatarFiles(files);
  };

  const handleFormSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Handle avatar upload if new file was selected
      let finalAvatarUrl = avatarUrl;
      if (avatarFiles.length > 0 && avatarFiles[0].file) {
        console.log('New avatar file selected:', avatarFiles[0].file);
      }

      await updateProfile(user.id, {
        ...data,
        avatar_url: finalAvatarUrl,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      
      // Update user context
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
    <Fragment>
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
                <Fragment><KeenIcon icon="loading" className="animate-spin mr-2" /> Saving...</Fragment>
              ) : (
                <Fragment><KeenIcon icon="check" /> Save Changes</Fragment>
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
              <CardContent className="text-center pb-8">
                <div className="flex justify-center mb-6">
                  <AvatarInput 
                    value={avatarFiles}
                    onChange={handleAvatarFilesChange}
                  />
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 border-dashed">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Click on the avatar to upload a new photo. Recommended size: 300x300px. JPG, PNG or SVG.
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
    </Fragment>
  );
}

