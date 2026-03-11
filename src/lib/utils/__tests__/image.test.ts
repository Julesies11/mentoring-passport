import { describe, it, expect, vi, beforeEach } from 'vitest';
import { compressImage, validateImage, COMPRESSION_PRESETS } from '../image';
import imageCompression from 'browser-image-compression';

// Mock browser-image-compression
vi.mock('browser-image-compression', () => ({
  default: vi.fn((file) => Promise.resolve(file)),
}));

describe('Image Utilities', () => {
  const mockFile = new File(['fake image content'], 'test.jpg', { type: 'image/jpeg' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateImage', () => {
    it('should return no error for valid images', () => {
      const result = validateImage(mockFile);
      expect(result.error).toBeUndefined();
    });

    it('should return error for files larger than 10MB', () => {
      const largeFile = { size: 11 * 1024 * 1024, type: 'image/jpeg' } as File;
      const result = validateImage(largeFile);
      expect(result.error).toContain('Image is too large');
    });

    it('should return error for unsupported file types', () => {
      const invalidFile = new File(['text content'], 'test.txt', { type: 'text/plain' });
      const result = validateImage(invalidFile);
      expect(result.error).toContain('Invalid file type');
    });
  });

  describe('compressImage', () => {
    it('should call imageCompression with AVATAR preset by default', async () => {
      await compressImage(mockFile);
      
      expect(imageCompression).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining(COMPRESSION_PRESETS.AVATAR)
      );
    });

    it('should call imageCompression with EVIDENCE preset when specified', async () => {
      await compressImage(mockFile, 'EVIDENCE');
      
      expect(imageCompression).toHaveBeenCalledWith(
        mockFile,
        expect.objectContaining(COMPRESSION_PRESETS.EVIDENCE)
      );
    });

    it('should return original file if not an image', async () => {
      const nonImageFile = new File(['text'], 'test.txt', { type: 'text/plain' });
      const result = await compressImage(nonImageFile);
      
      expect(result).toBe(nonImageFile);
      expect(imageCompression).not.toHaveBeenCalled();
    });

    it('should return original file and log error if compression fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(imageCompression).mockRejectedValueOnce(new Error('Compression failed'));

      const result = await compressImage(mockFile);
      
      expect(result).toBe(mockFile);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should preserve the original file name', async () => {
      const result = await compressImage(mockFile);
      expect(result.name).toBe(mockFile.name);
    });
  });
});
