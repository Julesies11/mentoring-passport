import { supabase } from '@/lib/supabase';
import { resizeImage, validateAvatar } from '@/lib/utils/image';
import { logError } from '@/lib/logger';

export interface UploadOptions {
  bucket: string;
  folder?: string;
  fileName?: string;
  resize?: {
    width: number;
    height: number;
  };
}

/**
 * Handles uploading a file to a specific Supabase bucket.
 * Reuses the "Gold Standard" validation and resizing logic.
 * Returns the final filename or path saved in the bucket.
 */
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<string> {
  // 1. Pre-flight validation (Gold Standard)
  const validation = validateAvatar(file);
  if (validation.error) {
    throw new Error(validation.error);
  }

  try {
    // 2. Resize and compress (default to 400x400)
    const resizeWidth = options.resize?.width ?? 400;
    const resizeHeight = options.resize?.height ?? 400;
    const processedBlob = await resizeImage(file, resizeWidth, resizeHeight);
    
    const fileExt = 'jpg';
    const timestamp = Date.now();
    // Default fileName pattern if not provided
    const name = options.fileName || `file-${timestamp}.${fileExt}`;
    const folderPath = options.folder ? `${options.folder}/` : '';
    const filePath = `${folderPath}${name}`;

    // 3. Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(options.bucket)
      .upload(filePath, processedBlob, { 
        upsert: true,
        contentType: 'image/jpeg'
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    return name; // Return the filename part
  } catch (err: any) {
    // LOG THE FAILURE TO THE DATABASE (GOLD STANDARD)
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

    // RETHROW so the UI can show the specific error
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
 * Handles both absolute URLs and relative storage paths.
 */
export function getPublicUrl(bucket: string, path?: string | null, userId?: string): string {
  if (!path) return '';
  
  // If it's already a full URL, return as is
  if (path.startsWith('http')) {
    return path;
  }
  
  // Construct Supabase public URL. If userId provided, use it as a subfolder
  const fullPath = userId ? `${userId}/${path}` : path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath);
  return data.publicUrl;
}
