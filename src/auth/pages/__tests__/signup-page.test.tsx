import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  
  // Use a longer timeout for userEvent and animations
  vi.setConfig({ testTimeout: 15000 });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<SignUpPage />, { authValue: { register: mockRegister } });
    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument();
  });

  it('submits the form with valid data', async () => {
    const user = userEvent.setup();
    render(<SignUpPage />, { authValue: { register: mockRegister } });
    
    // 1. Wait for organisations to finish loading (Select becomes enabled)
    await waitFor(() => {
      expect(screen.queryByText(/Loading organisations.../i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    await user.type(screen.getByPlaceholderText(/^First Name$/i), 'John');
    await user.type(screen.getByPlaceholderText(/^Last Name$/i), 'Doe');
    await user.type(screen.getByPlaceholderText(/your email address/i), 'john@example.com');
    
    // 2. Select organisation
    const selectTrigger = screen.getByRole('combobox', { name: /organisation/i });
    await user.click(selectTrigger);
    const option = await screen.findByRole('option', { name: 'Fiona Stanley Hospital' });
    await user.click(option);

    await user.type(screen.getByPlaceholderText(/create a password/i), 'Password123!');
    await user.type(screen.getByPlaceholderText(/confirm your password/i), 'Password123!');
    
    const termsCheckbox = screen.getByRole('checkbox');
    await user.click(termsCheckbox);
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'john@example.com',
        'Password123!',
        'Password123!',
        'John',
        'Doe',
        'org1'
      );
    }, { timeout: 10000 });
    
    expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
  });

  it('shows error message if registration fails', async () => {
    const user = userEvent.setup();
    const errorMsg = 'Email already in use';
    const failingRegister = vi.fn().mockRejectedValue(new Error(errorMsg));
    
    render(<SignUpPage />, { authValue: { register: failingRegister } });
    
    // Wait for organisations to load
    await waitFor(() => {
      expect(screen.queryByText(/Loading organisations.../i)).not.toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/^First Name$/i), 'John');
    await user.type(screen.getByPlaceholderText(/^Last Name$/i), 'Doe');
    await user.type(screen.getByPlaceholderText(/your email address/i), 'existing@example.com');
    
    // Select organisation
    await user.click(screen.getByRole('combobox', { name: /organisation/i }));
    await user.click(await screen.findByRole('option', { name: 'Fiona Stanley Hospital' }));

    await user.type(screen.getByPlaceholderText(/create a password/i), 'Password123!');
    await user.type(screen.getByPlaceholderText(/confirm your password/i), 'Password123!');
    await user.click(screen.getByRole('checkbox'));
    
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('shows validation error if passwords do not match', async () => {
    const user = userEvent.setup();
    render(<SignUpPage />, { authValue: { register: mockRegister } });
    
    // Wait for organisations to load to ensure UI is ready
    await waitFor(() => {
      expect(screen.queryByText(/Loading organisations.../i)).not.toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText(/create a password/i), 'Password123!');
    await user.type(screen.getByPlaceholderText(/confirm your password/i), 'WrongPassword!');
    await user.click(screen.getByRole('checkbox'));
    
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    }, { timeout: 10000 });
    expect(mockRegister).not.toHaveBeenCalled();
  });
});
