import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChangePasswordPage } from '../ChangePasswordPage';
import { render } from '@/test/utils';

// Mock Supabase with manual return functions to avoid vi.mocked chains failing
const mockUpdateUser = vi.fn();
const mockFrom = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: (...args: any[]) => mockUpdateUser(...args),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: (...args: any[]) => mockFrom(...args),
    update: (...args: any[]) => mockUpdate(...args),
    eq: (...args: any[]) => mockEq(...args),
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
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  };
});

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock setup for successful chain
    mockFrom.mockReturnValue({
      update: mockUpdate.mockReturnValue({
        eq: mockEq.mockResolvedValue({ data: {}, error: null })
      })
    });
  });

  it('renders correctly when logged in (forced change)', () => {
    render(<ChangePasswordPage />, { 
      authValue: { user: { id: 'u1' } as any, role: 'program-member' } 
    });
    expect(screen.getByRole('heading', { name: /change your password/i })).toBeInTheDocument();
  });

  it('submits the form successfully', async () => {
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
    
    render(<ChangePasswordPage />, { 
      authValue: { user: { id: 'u1' } as any, role: 'program-member' } 
    });
    
    fireEvent.change(screen.getByPlaceholderText(/create a strong password/i), { target: { value: 'NewPassword123!' } });
    fireEvent.change(screen.getByPlaceholderText(/verify your password/i), { target: { value: 'NewPassword123!' } });
    
    fireEvent.submit(screen.getByRole('button', { name: /reset password/i }).closest('form')!);

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewPassword123!' });
    }, { timeout: 4000 });
    
    expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
  });

  it('shows error if update fails', async () => {
    const errorMsg = 'Invalid password';
    mockUpdateUser.mockResolvedValue({ 
      data: { user: null }, 
      error: { message: errorMsg } as any 
    });
    
    render(<ChangePasswordPage />, { 
      authValue: { user: { id: 'u1' } as any, role: 'program-member' } 
    });
    
    fireEvent.change(screen.getByPlaceholderText(/create a strong password/i), { target: { value: 'ValidPassword123!' } });
    fireEvent.change(screen.getByPlaceholderText(/verify your password/i), { target: { value: 'ValidPassword123!' } });
    
    fireEvent.submit(screen.getByRole('button', { name: /reset password/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    }, { timeout: 4000 });
  });
});
