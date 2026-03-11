import { supabase } from '@/lib/supabase';
import { validateImage, compressImage, COMPRESSION_PRESETS } from '@/lib/utils/image';
import { logError } from '@/lib/logger';

export interface UploadOptions {
  bucket: string;
  folder?: string;
  fileName?: string;
  compressionPreset?: keyof typeof COMPRESSION_PRESETS;
}

/**
 * Handles uploading a file to a specific Supabase bucket.
 * Uses centralized compression engine for efficiency.
 * Returns the final filename or path saved in the bucket.
 */
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<string> {
  // 1. Validation
  const validation = validateImage(file);
  if (validation.error) {
    throw new Error(validation.error);
  }

  try {
    // 2. Compress using specified preset or default to AVATAR for safety
    const preset = options.compressionPreset || 'AVATAR';
    const processedFile = await compressImage(file, preset);
    
    const timestamp = Date.now();
    const name = options.fileName || `file-${timestamp}.jpg`;
    const folderPath = options.folder ? `${options.folder}/` : '';
    const filePath = `${folderPath}${name}`;

    // 3. Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(options.bucket)
      .upload(filePath, processedFile, { 
        upsert: true,
        contentType: processedFile.type || 'image/jpeg'
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    return name;
  } catch (err: any) {
    await logError({
      message: `File upload failed to bucket ${options.bucket}: ${err.message}`,
      stack: err.stack,
      componentName: 'storage-api',
      metadata: { 
        bucket: options.bucket,
        originalSize: file.size, 
        originalType: file.type,
        fileName: file.name
      }
    });
    throw err;
  }
}

/**
 * Deletes a file from a specific Supabase bucket.
 */
export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) {
    await logError({
      message: `File deletion failed from bucket ${bucket}: ${error.message}`,
      componentName: 'storage-api',
      metadata: { bucket, filePath }
    });
    throw error;
  }
}

/**
 * Constructs a full public URL for a file in a Supabase bucket.
 */
export function getPublicUrl(bucket: string, path?: string | null, userId?: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  
  const fullPath = userId ? `${userId}/${path}` : path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath);
  return data.publicUrl;
}
