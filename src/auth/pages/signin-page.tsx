import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { supabase } from '@/lib/supabase';
import { logDebug } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getSigninSchema, SigninSchemaType } from '../forms/signin-schema';
import { LoaderCircleIcon } from 'lucide-react';

export function SignInPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick test login function
  const handleTestLogin = async (email = 'admin@test.com', password = 'Admin123!') => {
    try {
      setIsProcessing(true);
      setError(null);
      await login(email, password);
      
      // Check if user needs to change password
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('mp_profiles')
          .select('must_change_password')
          .eq('id', authUser.id)
          .single();
        
        if (profile?.must_change_password) {
          navigate('/auth/change-password');
          return;
        }
      }
      
      const nextPath = searchParams.get('next') || '/';
      navigate(nextPath);
    } catch (err) {
      console.error('Test login error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Test login failed. Make sure to run the SQL script to create the test user.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Check for success message from password reset or error messages
  useEffect(() => {
    const pwdReset = searchParams.get('pwd_reset');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (pwdReset === 'success') {
      setSuccessMessage(
        'Your password has been successfully reset. You can now sign in with your new password.',
      );
    }

    if (errorParam) {
      switch (errorParam) {
        case 'auth_callback_failed':
          setError(
            errorDescription || 'Authentication failed. Please try again.',
          );
          break;
        case 'auth_callback_error':
          setError(
            errorDescription ||
              'An error occurred during authentication. Please try again.',
          );
          break;
        case 'auth_token_error':
          setError(
            errorDescription ||
              'Failed to set authentication session. Please try again.',
          );
          break;
        default:
          setError(
            errorDescription || 'Authentication error. Please try again.',
          );
          break;
      }
    }
  }, [searchParams]);

  const form = useForm<SigninSchemaType>({
    resolver: zodResolver(getSigninSchema()),
    defaultValues: {
      email: 'demo@kt.com',
      password: 'demo123',
      rememberMe: true,
    },
  });

  async function onSubmit(values: SigninSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);

      logDebug('Attempting to sign in with email:', values.email);

      // Simple validation
      if (!values.email.trim() || !values.password) {
        setError('Email and password are required');
        return;
      }

      // Sign in using the auth context
      await login(values.email, values.password);

      // Check if user needs to change password
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('mp_profiles')
          .select('must_change_password')
          .eq('id', authUser.id)
          .single();
        
        if (profile?.must_change_password) {
          navigate('/auth/change-password');
          return;
        }
      }

      // Get the 'next' parameter from URL if it exists
      const nextPath = searchParams.get('next') || '/';

      // Use navigate for navigation
      navigate(nextPath);
    } catch (err) {
      console.error('Unexpected sign-in error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="block w-full space-y-5"
      >
        <div className="text-center space-y-1 pb-3">
          <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back! Log in with your credentials.
          </p>
        </div>

        <Alert variant="primary" size="sm" close={false}>
          <AlertIcon>
            <AlertCircle className="text-primary" />
          </AlertIcon>
          <AlertTitle className="text-accent-foreground">
            <strong>Quick Test Login:</strong> Click the buttons below to sign in with test credentials.
          </AlertTitle>
        </Alert>

        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            type="button"
            onClick={() => handleTestLogin('admin@test.com', 'Admin123!')}
            disabled={isProcessing}
            className="w-full bg-purple-600 border-purple-600 text-white hover:bg-purple-700 font-bold"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <LoaderCircleIcon className="size-4! animate-spin" /> Signing in...
              </span>
            ) : (
              'Org Admin (Leesa)'
            )}
          </Button>

          <Button
            variant="primary"
            type="button"
            onClick={() => handleTestLogin('nick@test.com', 'Demo123!!')}
            disabled={isProcessing}
            className="w-full bg-primary border-primary text-white hover:bg-primary-dark font-bold"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <LoaderCircleIcon className="size-4! animate-spin" /> Signing in...
              </span>
            ) : (
              'Supervisor (Nick)'
            )}
          </Button>

          <div className="flex flex-row gap-2">
            <Button
              variant="primary"
              type="button"
              onClick={() => handleTestLogin('jackie@test.com', 'U12345678')}
              disabled={isProcessing}
              className="w-full bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
            >
              Participant (Jackie)
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={() => handleTestLogin('bill@test.com', 'U12345678')}
              disabled={isProcessing}
              className="w-full bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
            >
              Participant (Bill)
            </Button>
          </div>
        </div>

        <div className="relative py-1.5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or sign in manually</span>
          </div>
        </div>

        {error && (
          <Alert
            variant="destructive"
            onClose={() => setError(null)}
          >
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        {successMessage && (
          <Alert onClose={() => setSuccessMessage(null)}>
            <AlertIcon>
              <Check />
            </AlertIcon>
            <AlertTitle>{successMessage}</AlertTitle>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Your email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center gap-2.5">
                <FormLabel>Password</FormLabel>
              </div>
              <div className="relative">
                <Input
                  placeholder="Your password"
                  type={passwordVisible ? 'text' : 'password'} // Toggle input type
                  {...field}
                />
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                >
                  {passwordVisible ? (
                    <EyeOff className="text-muted-foreground" />
                  ) : (
                    <Eye className="text-muted-foreground" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rememberMe"
          render={({ field }) => (
            <FormItem className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">
                    Remember me
                  </FormLabel>
                </div>
                <Link
                  to="/auth/reset-password"
                  className="text-sm font-semibold text-foreground hover:text-primary"
                >
                  Forgot Password?
                </Link>
              </div>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isProcessing}>
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Loading...
            </span>
          ) : (
            'Sign In'
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground mt-4">
          Powered by Mentoring Program
        </div>
      </form>
    </Form>
  );
}
