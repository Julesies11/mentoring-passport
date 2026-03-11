import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAvatarUpload, getAvatarUrl } from '../profiles';
import { supabase } from '@/lib/supabase';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}));

// Mock image utilities
vi.mock('@/lib/utils/image', () => ({
  compressImage: vi.fn((file) => Promise.resolve(new File([file], file.name, { type: 'image/jpeg' }))),
  validateImage: vi.fn(() => ({ error: undefined })),
  COMPRESSION_PRESETS: {
    AVATAR: { maxSizeMB: 0.05 },
    EVIDENCE: { maxSizeMB: 0.8 }
  }
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

describe('Profile Avatar Utilities', () => {
  const userId = 'user-123';
  const mockFile = new File(['dummy content'], 'avatar.png', { type: 'image/png' });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleAvatarUpload', () => {
    it('should return null when shouldDelete is true', async () => {
      const result = await handleAvatarUpload(userId, null, true);
      expect(result).toBe(null);
    });

    it('should upload file and return fileName when file is provided', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ data: {}, error: null });
      (supabase.storage.from as any).mockReturnValue({ 
        upload: mockUpload,
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'some-url' } })
      });

      const result = await handleAvatarUpload(userId, mockFile, false);

      expect(supabase.storage.from).toHaveBeenCalledWith('mp-avatars');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${userId}/${userId}-\\d+\\.jpg$`)),
        expect.any(File), // The compressed file
        expect.objectContaining({ 
          upsert: true,
          contentType: 'image/jpeg'
        })
      );
      expect(result).toMatch(new RegExp(`^${userId}-\\d+\\.jpg$`));
    });

    it('should return currentAvatarUrl when no file and not deleting', async () => {
      const currentUrl = 'existing-avatar.jpg';
      const result = await handleAvatarUpload(userId, null, false, currentUrl);
      expect(result).toBe(currentUrl);
    });

    it('should throw error if upload fails', async () => {
      const mockUpload = vi.fn().mockResolvedValue({ data: null, error: { message: 'Upload failed' } });
      (supabase.storage.from as any).mockReturnValue({ upload: mockUpload });

      await expect(handleAvatarUpload(userId, mockFile)).rejects.toThrow('Upload failed');
    });
  });

  describe('getAvatarUrl', () => {
    it('should return empty string if avatarPath is missing', () => {
      expect(getAvatarUrl(userId, null)).toBe('');
      expect(getAvatarUrl(userId, undefined)).toBe('');
    });

    it('should return original URL if it starts with http', () => {
      const url = 'https://example.com/photo.jpg';
      expect(getAvatarUrl(userId, url)).toBe(url);
    });

    it('should construct Supabase public URL for storage paths', () => {
      const avatarPath = 'avatar-123.png';
      const expectedUrl = `https://supabase.com/storage/v1/object/public/mp-avatars/${userId}/${avatarPath}`;
      
      const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: expectedUrl } });
      (supabase.storage.from as any).mockReturnValue({ getPublicUrl: mockGetPublicUrl });

      const result = getAvatarUrl(userId, avatarPath);

      expect(supabase.storage.from).toHaveBeenCalledWith('mp-avatars');
      expect(mockGetPublicUrl).toHaveBeenCalledWith(`${userId}/${avatarPath}`);
      expect(result).toBe(expectedUrl);
    });
  });
});
