import { MutableRefObject } from 'react';
import { ImageInputFiles } from './image-input';
import { compressImage, COMPRESSION_PRESETS } from '@/lib/utils/image';

export const openFileDialog = (
  inputRef: MutableRefObject<HTMLInputElement | null>,
): void => {
  if (!inputRef.current) {
    return;
  }
  inputRef.current.click();
};

export const getAcceptTypeString = (
  acceptType?: string[],
  allowNonImageType?: boolean,
) => {
  if (acceptType?.length)
    return acceptType.map((item) => `.${item}`).join(', ');
  if (allowNonImageType) return '';
  return 'image/*';
};

export const getBase64 = async (file: File | Blob): Promise<string> => {
  const reader = new FileReader();
  return await new Promise((resolve) => {
    reader.addEventListener('load', () => {
      resolve(String(reader.result));
    });
    reader.readAsDataURL(file);
  });
};

export const getImage = async (file: File): Promise<HTMLImageElement> => {
  const image = new Image();
  return await new Promise((resolve) => {
    image.addEventListener('load', () => {
      resolve(image);
    });
    image.src = URL.createObjectURL(file);
  });
};

/**
 * Standardized function to process uploaded images for ImageInput.
 * Uses centralized compression engine and presets.
 */
export const getListFiles = async (
  files: FileList,
  dataURLKey: string,
  compress: boolean = true,
  compressionOptions: any = COMPRESSION_PRESETS.AVATAR,
): Promise<ImageInputFiles> => {
  const processedFiles: ImageInputFiles = [];

  for (let i = 0; i < files.length; i += 1) {
    let file = files[i];

    if (compress && file.type.startsWith('image/')) {
      file = await compressImage(file, compressionOptions);
    }

    const dataURL = await getBase64(file);
    processedFiles.push({
      [dataURLKey]: dataURL,
      file: file,
    });
  }

  return processedFiles;
};
