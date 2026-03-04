import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '../badge';

describe('Badge', () => {
  it('renders correctly with children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Badge variant="primary">Primary</Badge>);
    expect(screen.getByText(/primary/i)).toHaveClass('bg-primary');

    rerender(<Badge variant="destructive">Destructive</Badge>);
    expect(screen.getByText(/destructive/i)).toHaveClass('bg-destructive');

    rerender(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText(/outline/i)).toHaveClass('border-border');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText(/small/i)).toHaveClass('px-[0.325rem]');

    rerender(<Badge size="lg">Large</Badge>);
    expect(screen.getByText(/large/i)).toHaveClass('px-[0.5rem]');
  });
});
