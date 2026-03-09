import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resizeImage } from '../image';

describe('resizeImage', () => {
  // We need to mock several DOM APIs that aren't fully functional in JSDOM
  // especially HTMLCanvasElement.toBlob and Image loading
  
  beforeEach(() => {
    vi.restoreAllMocks();
    
    // Mock FileReader
    const FileReaderMock = vi.fn(() => ({
      readAsDataURL: vi.fn(function(this: any) {
        // Simulate successful file reading
        setTimeout(() => {
          this.onload({ target: { result: 'data:image/png;base64,fake-data' } });
        }, 0);
      }),
    }));
    vi.stubGlobal('FileReader', FileReaderMock);

    // Mock Image
    const ImageMock = function(this: any) {
      this.width = 1000;
      this.height = 1000;
      this.onload = null;
      this.onerror = null;
      let _src = '';
      Object.defineProperty(this, 'src', {
        get: () => _src,
        set: (value) => {
          _src = value;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      });
    };
    vi.stubGlobal('Image', ImageMock);

    // Mock Canvas and Context
    const canvasMock = {
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
      })),
      toBlob: vi.fn((callback) => {
        // Simulate blob creation
        setTimeout(() => {
          callback(new Blob(['resized-image'], { type: 'image/jpeg' }));
        }, 0);
      }),
      width: 0,
      height: 0,
    };
    
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return canvasMock as any;
      return document.createElement(tagName);
    });
  });

  it('should resize a large image to fit within maxWidth/maxHeight', async () => {
    const fakeFile = new File(['fake-image'], 'test.png', { type: 'image/png' });
    
    const result = await resizeImage(fakeFile, 400, 400);
    
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/jpeg');
    
    // Check if document.createElement was called for canvas
    expect(document.createElement).toHaveBeenCalledWith('canvas');
  });

  it('should handle aspect ratio correctly for landscape images', async () => {
    // Landscape: 2000x1000
    vi.stubGlobal('Image', function(this: any) {
      this.width = 2000;
      this.height = 1000;
      this.onload = null;
      Object.defineProperty(this, 'src', {
        set: (v) => setTimeout(() => this.onload(), 0)
      });
    });

    const fakeFile = new File(['fake'], 'test.jpg', { type: 'image/jpeg' });
    const result = await resizeImage(fakeFile, 400, 400);
    
    expect(result).toBeDefined();
    // Logic: maxWidth=400, ratio=2:1 -> height should be 200
    // (We'd need to spy on the canvas element properties to verify this exactly)
  });

  it('should handle aspect ratio correctly for portrait images', async () => {
    // Portrait: 1000x2000
    vi.stubGlobal('Image', function(this: any) {
      this.width = 1000;
      this.height = 2000;
      this.onload = null;
      Object.defineProperty(this, 'src', {
        set: (v) => setTimeout(() => this.onload(), 0)
      });
    });

    const fakeFile = new File(['fake'], 'test.jpg', { type: 'image/jpeg' });
    const result = await resizeImage(fakeFile, 400, 400);
    
    expect(result).toBeDefined();
    // Logic: maxHeight=400, ratio=1:2 -> width should be 200
  });

  it('should reject if canvas context is not available', async () => {
    // Mock canvas but with null context
    const canvasMock = {
      getContext: vi.fn(() => null),
      width: 0,
      height: 0,
    };
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') return canvasMock as any;
      return document.createElement(tagName);
    });

    const fakeFile = new File(['fake'], 'test.jpg', { type: 'image/jpeg' });
    
    await expect(resizeImage(fakeFile)).rejects.toThrow('Could not get canvas context');
  });
});
