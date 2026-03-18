import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignInPage } from '../signin-page';
import { render } from '@/test/utils';
import { supabase } from '@/lib/supabase';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { must_change_password: false }, error: null }),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

describe('SignInPage', () => {
  const mockLogin = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<SignInPage />, { authValue: { login: mockLogin } });
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('submits the form with email and password', async () => {
    render(<SignInPage />, { authValue: { login: mockLogin } });
    
    const emailInput = screen.getByPlaceholderText(/your email/i);
    const passwordInput = screen.getByPlaceholderText(/your password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Fill the form
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Submit
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error message if login fails', async () => {
    const errorMsg = 'Invalid credentials';
    const failingLogin = vi.fn().mockRejectedValue(new Error(errorMsg));
    
    render(<SignInPage />, { authValue: { login: failingLogin } });
    
    const emailInput = screen.getByPlaceholderText(/your email/i);
    const passwordInput = screen.getByPlaceholderText(/your password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    });
  });

  it('handles quick test login buttons', async () => {
    render(<SignInPage />, { authValue: { login: mockLogin } });

    const orgAdminButton = screen.getByRole('button', { name: /org admin/i });
    fireEvent.click(orgAdminButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'Admin123!');
    });

    const supervisorButton = screen.getByRole('button', { name: /supervisor \(nick\)/i });
    fireEvent.click(supervisorButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('nick@test.com', 'Demo123!!');
    });
  });
  it('navigates to change-password if must_change_password is true', async () => {
    const mustChangeLogin = vi.fn().mockResolvedValue({ id: 'u1', must_change_password: true });
    
    render(<SignInPage />, { authValue: { login: mustChangeLogin } });
    
    const emailInput = screen.getByPlaceholderText(/your email/i);
    const passwordInput = screen.getByPlaceholderText(/your password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth/change-password');
    });
  });
});
