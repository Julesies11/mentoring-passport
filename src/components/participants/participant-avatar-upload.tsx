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
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface ParticipantAvatarUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string;
  currentAvatar?: string | null;
  userName?: string;
  onAvatarChange: (avatarUrl: string | null) => void;
}

export function ParticipantAvatarUpload({
  open,
  onOpenChange,
  participantId,
  currentAvatar,
  userName,
  onAvatarChange,
}: ParticipantAvatarUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarUrl = () => {
    if (currentAvatar) {
      // If it's already a full URL, return as is
      if (currentAvatar.startsWith('http')) {
        return currentAvatar;
      }
      // If it's a Supabase path, construct the public URL with user folder
      const fullPath = `${participantId}/${currentAvatar}`;
      return supabase.storage.from('mp-avatars').getPublicUrl(fullPath).data.publicUrl;
    }
    // No avatar - return null to show initials only
    return null;
  };

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
    if (!selectedFile || !participantId) return;

    setIsUploading(true);
    try {
      // Generate unique file name with user ID folder structure
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${participantId}/${participantId}-${Date.now()}.${fileExt}`;
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('mp-avatars')
        .upload(fileName, selectedFile, {
          upsert: true,
          contentType: selectedFile.type,
        });

      if (uploadError) throw uploadError;

      // Update database to store only the filename
      const { error: updateError } = await supabase
        .from('mp_profiles')
        .update({ avatar_url: fileName.split('/').pop() })
        .eq('id', participantId);

      if (updateError) throw updateError;

      onAvatarChange(fileName.split('/').pop() || null);
      onOpenChange(false);
      setSelectedFile(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!participantId) return;

    try {
      // Delete from storage if it exists
      if (currentAvatar && !currentAvatar.startsWith('http')) {
        const fullPath = `${participantId}/${currentAvatar}`;
        await supabase.storage.from('mp-avatars').remove([fullPath]);
      }

      // Update database to remove avatar
      const { error } = await supabase
        .from('mp_profiles')
        .update({ avatar_url: null })
        .eq('id', participantId);

      if (error) throw error;

      onAvatarChange(null);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting avatar:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Picture</DialogTitle>
          <DialogDescription>
            Upload or change profile picture for {userName || 'this participant'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current/Preview Avatar */}
          <div className="flex justify-center">
            <Avatar className="h-24 w-24">
              <AvatarImage 
                src={previewUrl || getAvatarUrl() || undefined} 
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
  );
}
