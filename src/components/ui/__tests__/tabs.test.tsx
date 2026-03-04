import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

describe('Tabs', () => {
  it('renders correctly', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );
    
    expect(screen.getByText(/tab 1/i)).toBeInTheDocument();
    expect(screen.getByText(/content 1/i)).toBeInTheDocument();
    expect(screen.queryByText(/content 2/i)).not.toBeInTheDocument();
  });

  it('switches content when a tab is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    );
    
    const tab2 = screen.getByRole('tab', { name: /tab 2/i });
    await user.click(tab2);
    
    await waitFor(() => {
      expect(screen.getByText(/content 2/i)).toBeInTheDocument();
    }, { timeout: 2000 });
    
    expect(screen.queryByText(/content 1/i)).not.toBeInTheDocument();
  });

  it('renders different variants', () => {
    const { rerender } = render(
      <Tabs defaultValue="tab1">
        <TabsList variant="line">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByRole('tablist')).toHaveClass('border-b');

    rerender(
      <Tabs defaultValue="tab1">
        <TabsList variant="default">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    );
    expect(screen.getByRole('tablist')).toHaveClass('bg-accent');
  });
});
