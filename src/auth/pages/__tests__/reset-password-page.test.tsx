import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResetPasswordPage } from '../ResetPasswordPage';
import { render } from '@/test/utils';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ResetPasswordPage />);
    expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your.email@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('submits the form and shows success message', async () => {
    const user = userEvent.setup();
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ data: {}, error: null });
    
    render(<ResetPasswordPage />);
    
    await user.type(screen.getByPlaceholderText(/your.email@example.com/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({ redirectTo: expect.stringContaining('/auth/reset-password') })
      );
    });
    
    expect(screen.getByText(/password reset link sent to test@example.com/i)).toBeInTheDocument();
  });

  it('shows error message if request fails', async () => {
    const user = userEvent.setup();
    const errorMsg = 'User not found';
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({ 
      data: null, 
      error: { message: errorMsg } as any 
    });
    
    render(<ResetPasswordPage />);
    
    await user.type(screen.getByPlaceholderText(/your.email@example.com/i), 'notfound@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(new RegExp(errorMsg, 'i'))).toBeInTheDocument();
    });
  });
});
