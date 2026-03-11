import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadFile } from '../storage';
import { supabase } from '@/lib/supabase';
import * as imageUtils from '@/lib/utils/image';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
      })),
    },
  },
}));

// Mock image utilities
vi.mock('@/lib/utils/image', () => ({
  compressImage: vi.fn((file) => Promise.resolve(file)),
  validateImage: vi.fn(() => ({ error: undefined })), // Return undefined for success
  COMPRESSION_PRESETS: {
    AVATAR: { maxSizeMB: 0.05 },
    EVIDENCE: { maxSizeMB: 0.8 }
  }
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

describe('Storage API - uploadFile', () => {
  const mockFile = new File(['fake image'], 'test.jpg', { type: 'image/jpeg' });
  const options = { bucket: 'test-bucket' };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(imageUtils.validateImage).mockReturnValue({ error: undefined });
  });

  it('should validate the image before uploading', async () => {
    vi.mocked(imageUtils.validateImage).mockReturnValue({ error: 'Too large' });
    
    await expect(uploadFile(mockFile, options)).rejects.toThrow('Too large');
    expect(imageUtils.validateImage).toHaveBeenCalledWith(mockFile);
  });

  it('should compress the image using the specified preset', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: {}, error: null });
    (supabase.storage.from as any).mockReturnValue({ upload: mockUpload });

    await uploadFile(mockFile, { ...options, compressionPreset: 'EVIDENCE' });

    expect(imageUtils.compressImage).toHaveBeenCalledWith(mockFile, 'EVIDENCE');
    expect(mockUpload).toHaveBeenCalled();
  });

  it('should default to AVATAR preset if none specified', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: {}, error: null });
    (supabase.storage.from as any).mockReturnValue({ upload: mockUpload });

    await uploadFile(mockFile, options);

    expect(imageUtils.compressImage).toHaveBeenCalledWith(mockFile, 'AVATAR');
  });

  it('should upload to the correct bucket and path', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: {}, error: null });
    (supabase.storage.from as any).mockReturnValue({ upload: mockUpload });

    const fileName = 'custom.jpg';
    const folder = 'user-1';
    await uploadFile(mockFile, { ...options, fileName, folder });

    expect(supabase.storage.from).toHaveBeenCalledWith('test-bucket');
    expect(mockUpload).toHaveBeenCalledWith(
      'user-1/custom.jpg',
      expect.any(File),
      expect.objectContaining({ contentType: 'image/jpeg' })
    );
  });

  it('should throw error and log if upload fails', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: null, error: { message: 'Failed' } });
    (supabase.storage.from as any).mockReturnValue({ upload: mockUpload });

    await expect(uploadFile(mockFile, options)).rejects.toThrow('Storage upload failed: Failed');
  });
});
