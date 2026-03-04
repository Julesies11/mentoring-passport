import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignUpPage } from '../signup-page';
import { render } from '@/test/utils';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  };
});

describe('SignUpPage', () => {
  const mockRegister = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<SignUpPage />, { authValue: { register: mockRegister } });
    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
  });

  it('submits the form with valid data', async () => {
    render(<SignUpPage />, { authValue: { register: mockRegister } });
    
    fireEvent.change(screen.getByPlaceholderText(/enter your first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/your email address/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/create a password/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), { target: { value: 'Password123!' } });
    
    const termsCheckbox = screen.getByRole('checkbox');
    fireEvent.click(termsCheckbox);
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.submit(submitButton.closest('form')!);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'john@example.com',
        'Password123!',
        'Password123!',
        'John',
        'Doe'
      );
    }, { timeout: 4000 });
    
    expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
  });

  it('shows error message if registration fails', async () => {
    const errorMsg = 'Email already in use';
    const failingRegister = vi.fn().mockRejectedValue(new Error(errorMsg));
    
    render(<SignUpPage />, { authValue: { register: failingRegister } });
    
    fireEvent.change(screen.getByPlaceholderText(/enter your first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/enter your last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/your email address/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/create a password/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('checkbox'));
    
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('shows validation error if passwords do not match', async () => {
    render(<SignUpPage />, { authValue: { register: mockRegister } });
    
    fireEvent.change(screen.getByPlaceholderText(/create a password/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), { target: { value: 'WrongPassword!' } });
    fireEvent.click(screen.getByRole('checkbox'));
    
    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    }, { timeout: 4000 });
    expect(mockRegister).not.toHaveBeenCalled();
  });
});
