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
  },
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
      (supabase.storage.from as any).mockReturnValue({ upload: mockUpload });

      const result = await handleAvatarUpload(userId, mockFile, false);

      expect(supabase.storage.from).toHaveBeenCalledWith('mp-avatars');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining(`${userId}/`),
        mockFile,
        { upsert: true }
      );
      expect(result).toMatch(new RegExp(`^${userId}-\d+\.png$`));
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
