import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilePreviewCard } from '../file-preview-card';
import { render } from '@/test/utils';

// Mock window.open
const windowOpenMock = vi.fn();
vi.stubGlobal('open', windowOpenMock);

describe('FilePreviewCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly in its initial state', () => {
    render(
      <FilePreviewCard 
        fileName="test-doc.pdf" 
        fileUrl="https://example.com/test.pdf" 
        mimeType="application/pdf" 
      />
    );

    expect(screen.getByText('test-doc.pdf')).toBeInTheDocument();
    expect(screen.getByText(/pdf/i)).toBeInTheDocument();
    // Should show Open button but NOT Preview button for PDFs
    expect(screen.queryByText(/preview/i)).not.toBeInTheDocument();
  });

  it('shows preview button for image files', () => {
    render(
      <FilePreviewCard 
        fileName="photo.jpg" 
        fileUrl="https://example.com/photo.jpg" 
        mimeType="image/jpeg" 
      />
    );

    expect(screen.getByText(/preview/i)).toBeInTheDocument();
  });

  it('toggles full preview when preview button is clicked', () => {
    render(
      <FilePreviewCard 
        fileName="photo.jpg" 
        fileUrl="https://example.com/photo.jpg" 
        mimeType="image/jpeg" 
      />
    );

    const previewBtn = screen.getByText(/preview/i);
    fireEvent.click(previewBtn);

    // Image should now be in the document
    const img = screen.getByAltText('Preview');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');

    // Should show Close button
    expect(screen.getByText(/close/i)).toBeInTheDocument();

    // Clicking Close should hide the preview
    fireEvent.click(screen.getByText(/close/i));
    expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
  });

  it('opens full size URL when external link button is clicked', () => {
    const fileUrl = "https://example.com/test.pdf";
    render(
      <FilePreviewCard 
        fileName="test.pdf" 
        fileUrl={fileUrl} 
        mimeType="application/pdf" 
      />
    );

    const openBtn = screen.getByTitle(/open full size/i);
    fireEvent.click(openBtn);

    expect(windowOpenMock).toHaveBeenCalledWith(fileUrl, '_blank');
  });

  it('handles missing fileUrl gracefully', () => {
    render(
      <FilePreviewCard 
        fileName="deleted-file.jpg" 
        fileUrl={null} 
        mimeType="image/jpeg" 
      />
    );

    expect(screen.getByText('deleted-file.jpg')).toHaveClass('text-gray-400');
    expect(screen.getByText(/file missing/i)).toBeInTheDocument();
    expect(screen.queryByText(/preview/i)).not.toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDeleteMock = vi.fn();
    // Mock window.confirm to return true
    vi.stubGlobal('confirm', vi.fn(() => true));

    render(
      <FilePreviewCard 
        fileName="test.pdf" 
        fileUrl="https://example.com/test.pdf" 
        mimeType="application/pdf" 
        onDelete={onDeleteMock}
      />
    );

    const deleteBtn = screen.getByTitle(/delete file/i);
    fireEvent.click(deleteBtn);

    expect(onDeleteMock).toHaveBeenCalled();
  });
});
