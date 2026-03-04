import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Alert, AlertTitle, AlertDescription } from '../alert';

describe('Alert', () => {
  it('renders correctly with title and description', () => {
    render(
      <Alert>
        <AlertTitle>Success</AlertTitle>
        <AlertDescription>Your changes have been saved.</AlertDescription>
      </Alert>
    );
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/success/i)).toBeInTheDocument();
    expect(screen.getByText(/your changes have been saved/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Alert close onClose={handleClose}>
        <AlertTitle>Closable Alert</AlertTitle>
      </Alert>
    );
    
    const closeButton = screen.getByLabelText(/dismiss/i);
    fireEvent.click(closeButton);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders with different variants', () => {
    const { rerender } = render(
      <Alert variant="destructive" appearance="solid">
        <AlertTitle>Error</AlertTitle>
      </Alert>
    );
    expect(screen.getByRole('alert')).toHaveClass('bg-destructive');

    rerender(
      <Alert variant="primary" appearance="outline">
        <AlertTitle>Primary</AlertTitle>
      </Alert>
    );
    expect(screen.getByRole('alert')).toHaveClass('text-primary');
  });
});
