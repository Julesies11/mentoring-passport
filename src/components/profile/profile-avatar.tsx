import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Upload, X, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { getAvatarPublicUrl, getInitials } from '@/lib/utils/avatar';

import { handleAvatarUpload } from '@/lib/api/profiles';

interface ProfileAvatarProps {
  userId: string;
  currentAvatar?: string | null;
  userName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showEditButton?: boolean;
  className?: string;
  onAvatarChange?: (avatarUrl: string | null) => void;
}

const sizeClasses = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
};

export function ProfileAvatar({
  userId,
  currentAvatar,
  userName,
  size = 'md',
  showEditButton = false,
  className,
  onAvatarChange,
}: ProfileAvatarProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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

  const handleUpload = async () => {
    if (!selectedFile || !userId) return;

    setIsUploading(true);
    try {
      // Use the Gold Standard handler instead of raw upload
      const fileName = await handleAvatarUpload(userId, selectedFile);

      if (fileName) {
        // Update database to link the new filename
        const { error: updateError } = await supabase
          .from('mp_profiles')
          .update({ avatar_url: fileName })
          .eq('id', userId);

        if (updateError) throw updateError;

        onAvatarChange?.(fileName);
        setDialogOpen(false);
        setSelectedFile(null);
        setPreviewUrl('');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      // handleAvatarUpload already logs to mp_error_logs
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!userId) return;

    try {
      // Delete from storage if it exists
      if (currentAvatar && !currentAvatar.startsWith('http')) {
        const fullPath = `${userId}/${currentAvatar}`;
        await supabase.storage.from('mp-avatars').remove([fullPath]);
      }

      // Update database to remove avatar
      const { error } = await supabase
        .from('mp_profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (error) throw error;

      onAvatarChange?.(null);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error deleting avatar:', error);
    }
  };

  return (
    <>
      <div className={cn('relative inline-flex', className)}>
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={getAvatarPublicUrl(currentAvatar, userId)} alt={userName || 'User avatar'} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        {showEditButton && (
          <Button
            size="sm"
            variant="outline"
            className="absolute -bottom-1 -right-1 size-6 rounded-full p-0 bg-background border-2"
            onClick={() => setDialogOpen(true)}
          >
            <Camera className="h-3 w-3" />
          </Button>
        )}
      </div>

      {showEditButton && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Profile Picture</DialogTitle>
              <DialogDescription>
                Upload or change your profile picture
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Current/Preview Avatar */}
                          <div className="flex justify-center">
                            <Avatar className="h-24 w-24">
                              <AvatarImage 
                                src={previewUrl || getAvatarPublicUrl(currentAvatar, userId)} 
                                alt="Profile preview" 
                              />
                              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                                {getInitials(userName)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                            {/* Upload Area */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                  selectedFile && 'border-primary bg-primary/5'
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
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl('');
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop a file here, or click to select
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                    <Button variant="outline" size="sm" asChild>
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        Select File
                      </label>
                    </Button>
                  </div>
                )}
              </div>

              {/* Guidelines */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Recommended: Square image, at least 200x200px</p>
                <p>• Maximum file size: 5MB</p>
                <p>• Supported formats: JPG, PNG, GIF</p>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              {currentAvatar && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isUploading}
                >
                  Remove
                </Button>
              )}
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
