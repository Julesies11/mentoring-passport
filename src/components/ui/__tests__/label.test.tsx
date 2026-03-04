import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Label } from '../label';

describe('Label', () => {
  it('renders correctly with children', () => {
    render(<Label>Username</Label>);
    expect(screen.getByText(/username/i)).toBeInTheDocument();
  });

  it('renders with custom variants', () => {
    const { rerender } = render(<Label variant="primary">Primary</Label>);
    expect(screen.getByText(/primary/i)).toHaveClass('font-medium');

    rerender(<Label variant="secondary">Secondary</Label>);
    expect(screen.getByText(/secondary/i)).toHaveClass('font-normal');
  });

  it('associates with an input via htmlFor', () => {
    render(
      <>
        <Label htmlFor="test-input">Label Text</Label>
        <input id="test-input" />
      </>
    );
    // screen.getByLabelText is a good way to verify association
    expect(screen.getByLabelText(/label text/i)).toBeInTheDocument();
  });
});
