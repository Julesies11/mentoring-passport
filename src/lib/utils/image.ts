import { logError } from '../logger';

/**
 * Validates an image file before processing.
 * @returns { error?: string }
 */
export function validateAvatar(file: File): { error?: string } {
  // 1. Check file size (Gold Standard: 10MB limit)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return { error: `Image is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please select an image under 10MB.` };
  }

  // 2. Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!validTypes.includes(file.type)) {
    return { error: 'Invalid file type. Please upload a JPG, PNG, or WebP image.' };
  }

  return {};
}

/**
 * Resizes an image to a specific dimension using a "step-down" approach for better quality 
 * and memory safety. Optimized for mobile.
 * 
 * @param file The original image file
 * @param targetWidth Target width
 * @param targetHeight Target height
 * @returns A Promise that resolves to a Blob
 */
export async function resizeImage(
  file: File,
  targetWidth: number = 400,
  targetHeight: number = 400
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const imageUri = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(imageUri);
      
      try {
        let width = img.width;
        let height = img.height;
        
        // Calculate final dimensions
        const ratio = width / height;
        if (width > height) {
          width = targetWidth;
          height = targetWidth / ratio;
        } else {
          height = targetHeight;
          width = targetHeight * ratio;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false }); // Optimization: no alpha
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // --- STEP DOWN SCALING (GOLD STANDARD) ---
        // We scale down in 50% increments to avoid aliasing artifacts and high memory spikes
        let cur = {
          width: Math.floor(img.width),
          height: Math.floor(img.height)
        };

        const tmpCanvas = document.createElement('canvas');
        const tmpCtx = tmpCanvas.getContext('2d', { alpha: false });
        
        if (!tmpCtx) throw new Error('Could not get temp canvas context');

        // Scale down loop
        while (cur.width * 0.5 > width) {
          cur.width = Math.floor(cur.width * 0.5);
          cur.height = Math.floor(cur.height * 0.5);
          
          tmpCanvas.width = cur.width;
          tmpCanvas.height = cur.height;
          tmpCtx.drawImage(img, 0, 0, cur.width, cur.height);
        }

        // Final scale
        canvas.width = width;
        canvas.height = height;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tmpCanvas.width > 0 ? tmpCanvas : img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas toBlob returned null'));
          },
          'image/jpeg',
          0.85
        );
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(imageUri);
      reject(new Error('Failed to load image into memory. The file might be corrupted.'));
    };

    img.src = imageUri;
  });
}
