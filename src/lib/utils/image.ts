import imageCompression from 'browser-image-compression';

/**
 * Standardized compression presets for the application.
 * - AVATAR: Optimized for fast-loading lists (256px / 50KB)
 * - EVIDENCE: Optimized for legibility/audit (1600px / 800KB)
 */
export const COMPRESSION_PRESETS = {
  AVATAR: {
    maxSizeMB: 0.05,
    maxWidthOrHeight: 256,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    preserveExif: false,
  },
  EVIDENCE: {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    preserveExif: false,
  },
};

/**
 * Validates an image file before processing.
 * @returns { error?: string }
 */
export function validateImage(file: File): { error?: string } {
  // Check file size (10MB hard limit for the browser to handle)
  const MAX_SIZE = 10 * 1024 * 1024; 
  if (file.size > MAX_SIZE) {
    return { error: `Image is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max 10MB allowed.` };
  }

  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    return { error: 'Invalid file type. Please upload a JPG, PNG, or WebP image.' };
  }

  return {};
}

/**
 * Standardized image compression utility.
 * Replaces all legacy/buggy canvas-based resizing.
 */
export async function compressImage(
  file: File,
  preset: keyof typeof COMPRESSION_PRESETS | typeof COMPRESSION_PRESETS.AVATAR = 'AVATAR'
): Promise<File> {
  // If not an image, return as-is
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const options = typeof preset === 'string' ? COMPRESSION_PRESETS[preset] : preset;

  try {
    // browser-image-compression handles aspect ratio and quality iterations automatically
    const compressedFile = await imageCompression(file, options);
    
    // Return a new File object with the same name as original
    return new File([compressedFile], file.name, {
      type: compressedFile.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Image compression failed, returning original file:', error);
    return file;
  }
}
