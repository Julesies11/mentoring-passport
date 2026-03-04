import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../select';

describe('Select', () => {
  it('renders correctly and opens options', async () => {
    const user = userEvent.setup();
    render(
      <Select defaultValue="apple">
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );
    
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText(/apple/i)).toBeInTheDocument();
    
    await user.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /banana/i })).toBeInTheDocument();
    });
  });

  it('changes value when an option is selected', async () => {
    const user = userEvent.setup();
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );
    
    await user.click(screen.getByRole('combobox'));
    
    const option = await screen.findByRole('option', { name: /banana/i });
    await user.click(option);
    
    await waitFor(() => {
      expect(screen.getByText(/banana/i)).toBeInTheDocument();
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('renders with different sizes', () => {
    const { rerender } = render(
      <Select>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByRole('combobox')).toHaveClass('h-7');

    rerender(
      <Select>
        <SelectTrigger size="lg">
          <SelectValue />
        </SelectTrigger>
      </Select>
    );
    expect(screen.getByRole('combobox')).toHaveClass('h-10');
  });
});
