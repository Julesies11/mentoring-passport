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
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className="max-w-[400px] w-full mx-auto">
      <CardContent className="p-6 lg:p-8">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="block w-full space-y-5"
          >
            <div className="text-center space-y-1 pb-3">
              <h1 className="text-2xl font-semibold tracking-tight uppercase tracking-widest text-gray-900">Sign In</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back! Log in with your credentials.
              </p>
            </div>

            <Alert variant="primary" size="sm" close={false}>
              <AlertIcon>
                <AlertCircle className="text-primary" />
              </AlertIcon>
              <AlertTitle className="text-accent-foreground text-xs">
                <strong>Quick Test Login:</strong> Click below to sign in with test credentials.
              </AlertTitle>
            </Alert>

            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                type="button"
                onClick={() => handleTestLogin('admin@test.com', 'Admin123!')}
                disabled={isProcessing}
                className="w-full bg-purple-600 border-purple-600 text-white hover:bg-purple-700 font-bold h-9"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2 text-xs">
                    <LoaderCircleIcon className="size-3.5 animate-spin" /> Signing in...
                  </span>
                ) : (
                  <span className="text-xs">Org Admin (Leesa)</span>
                )}
              </Button>

              <Button
                variant="primary"
                type="button"
                onClick={() => handleTestLogin('nick@test.com', 'Demo123!!')}
                disabled={isProcessing}
                className="w-full bg-primary border-primary text-white hover:bg-primary-dark font-bold h-9"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2 text-xs">
                    <LoaderCircleIcon className="size-3.5 animate-spin" /> Signing in...
                  </span>
                ) : (
                  <span className="text-xs">Supervisor (Nick)</span>
                )}
              </Button>

              <div className="flex flex-row gap-2">
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => handleTestLogin('jackie@test.com', 'U12345678')}
                  disabled={isProcessing}
                  className="w-full bg-blue-600 border-blue-600 text-white hover:bg-blue-700 h-9"
                >
                  <span className="text-[10px]">Jackie</span>
                </Button>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => handleTestLogin('bill@test.com', 'U12345678')}
                  disabled={isProcessing}
                  className="w-full bg-blue-600 border-blue-600 text-white hover:bg-blue-700 h-9"
                >
                  <span className="text-[10px]">Bill</span>
                </Button>
              </div>
            </div>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-gray-400 tracking-widest">
                <span className="bg-white px-2">or sign in manually</span>
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
                <AlertTitle className="text-xs">{error}</AlertTitle>
              </Alert>
            )}

            {successMessage && (
              <Alert onClose={() => setSuccessMessage(null)}>
                <AlertIcon>
                  <Check />
                </AlertIcon>
                <AlertTitle className="text-xs">{successMessage}</AlertTitle>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-500">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Your email" {...field} className="h-10" />
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
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-500">Password</FormLabel>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Your password"
                      type={passwordVisible ? 'text' : 'password'}
                      {...field}
                      className="h-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      mode="icon"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    >
                      {passwordVisible ? (
                        <EyeOff className="text-muted-foreground size-4" />
                      ) : (
                        <Eye className="text-muted-foreground size-4" />
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
                      <FormLabel className="text-xs font-bold text-gray-600 cursor-pointer">
                        Remember me
                      </FormLabel>
                    </div>
                    <Link
                      to="/auth/reset-password"
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-11 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={isProcessing}>
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Loading...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground mt-4">
              Don't have an account?{' '}
              <Link
                to="/auth/signup"
                className="font-bold text-primary hover:underline"
              >
                Sign Up
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default SignInPage;
