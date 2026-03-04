import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../card';

describe('Card', () => {
  it('renders correctly with children', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
        <CardContent>Card Content</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    );
    
    expect(screen.getByText(/card title/i)).toBeInTheDocument();
    expect(screen.getByText(/card content/i)).toBeInTheDocument();
    expect(screen.getByText(/card footer/i)).toBeInTheDocument();
  });

  it('renders with accent variant', () => {
    render(
      <Card variant="accent">
        <CardContent>Accent Card</CardContent>
      </Card>
    );
    const card = screen.getByText(/accent card/i).closest('[data-slot="card"]');
    expect(card).toHaveClass('bg-muted');
    
    const content = screen.getByText(/accent card/i);
    expect(content).toHaveClass('bg-card');
  });
});
