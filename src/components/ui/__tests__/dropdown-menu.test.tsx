import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../dropdown-menu';

describe('DropdownMenu', () => {
  it('renders correctly when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    
    const trigger = screen.getByRole('button', { name: /open menu/i });
    await user.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText(/my account/i)).toBeInTheDocument();
      expect(screen.getByText(/profile/i)).toBeInTheDocument();
      expect(screen.getByText(/settings/i)).toBeInTheDocument();
    });
  });

  it('calls onSelect when an item is clicked', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={handleSelect}>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    
    const item = await screen.findByText(/profile/i);
    await user.click(item);
    
    expect(handleSelect).toHaveBeenCalled();
  });

  it('renders destructive item correctly', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    
    const item = await screen.findByText(/delete/i);
    expect(item).toHaveClass('text-destructive');
  });
});
