import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Textarea } from '../textarea';

describe('Textarea', () => {
  it('renders correctly', () => {
    render(<Textarea placeholder="Enter your comments" />);
    expect(screen.getByPlaceholderText(/enter your comments/i)).toBeInTheDocument();
  });

  it('calls onChange handler when value changes', () => {
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} />);
    const textarea = screen.getByRole('textbox');
    
    fireEvent.change(textarea, { target: { value: 'This is a comment' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('is disabled when the disabled prop is true', () => {
    render(<Textarea disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('disabled:opacity-50');
  });

  it('renders in different variants', () => {
    const { rerender } = render(<Textarea variant="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-2.5');

    rerender(<Textarea variant="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('px-4');
  });

  it('passes other props correctly', () => {
    render(<Textarea rows={5} name="comments" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '5');
    expect(textarea).toHaveAttribute('name', 'comments');
  });
});
