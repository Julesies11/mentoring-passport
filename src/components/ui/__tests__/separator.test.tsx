import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Separator } from '../separator';

describe('Separator', () => {
  it('renders correctly as horizontal by default', () => {
    const { container } = render(<Separator />);
    const separator = container.querySelector('[data-slot="separator"]');
    
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveClass('h-px w-full');
  });

  it('renders correctly as vertical', () => {
    const { container } = render(<Separator orientation="vertical" />);
    const separator = container.querySelector('[data-slot="separator"]');
    
    expect(separator).toHaveClass('h-full w-px');
  });

  it('is decorative by default (role="none")', () => {
    const { container } = render(<Separator />);
    const separator = container.querySelector('[data-slot="separator"]');
    
    expect(separator).toHaveAttribute('role', 'none');
  });

  it('can be non-decorative (role="separator")', () => {
    const { container } = render(<Separator decorative={false} />);
    const separator = container.querySelector('[data-slot="separator"]');
    
    expect(separator).toHaveAttribute('role', 'separator');
  });
});
