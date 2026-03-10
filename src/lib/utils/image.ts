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
        const originalWidth = img.width;
        const originalHeight = img.height;
        
        // Calculate final dimensions while maintaining aspect ratio
        let finalWidth = originalWidth;
        let finalHeight = originalHeight;
        const ratio = originalWidth / originalHeight;

        if (originalWidth > targetWidth || originalHeight > targetHeight) {
          if (originalWidth > originalHeight) {
            finalWidth = targetWidth;
            finalHeight = targetWidth / ratio;
          } else {
            finalHeight = targetHeight;
            finalWidth = targetHeight * ratio;
          }
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        
        if (!ctx) throw new Error('Could not get canvas context');

        canvas.width = finalWidth;
        canvas.height = finalHeight;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // --- STEP DOWN SCALING ---
        // Only step down if the image is at least 2x the target size
        if (originalWidth > finalWidth * 2) {
          const tmpCanvas = document.createElement('canvas');
          const tmpCtx = tmpCanvas.getContext('2d', { alpha: false });
          if (!tmpCtx) throw new Error('Could not get temp canvas context');

          let cw = originalWidth;
          let ch = originalHeight;

          // Start from original image
          let source: CanvasImageSource = img;

          while (cw * 0.5 > finalWidth) {
            cw = Math.floor(cw * 0.5);
            ch = Math.floor(ch * 0.5);
            
            tmpCanvas.width = cw;
            tmpCanvas.height = ch;
            tmpCtx.drawImage(source, 0, 0, cw, ch);
            source = tmpCanvas; // Next iteration uses the scaled-down version
          }
          
          ctx.drawImage(tmpCanvas, 0, 0, finalWidth, finalHeight);
        } else {
          // Direct draw for smaller images or those not needing step-down
          ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
        }
        
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
