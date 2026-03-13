import { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { logDebug } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LoaderCircleIcon } from 'lucide-react';
import {
  getNewPasswordSchema,
  NewPasswordSchemaType,
} from '../forms/reset-password-schema';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, role } = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);

  // Check for different possible token parameter names used by Supabase
  // Supabase might use 'token', 'code', 'token_hash' or pass it as a URL hash
  const token =
    searchParams.get('token') ||
    searchParams.get('code') ||
    searchParams.get('token_hash');

  logDebug('Reset token from URL:', token);
  logDebug(
    'All search parameters:',
    Object.fromEntries(searchParams.entries()),
  );

  // Process Supabase recovery token
  useEffect(() => {
    // This automatically processes the token in the URL
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Token is valid and has been processed by Supabase
        logDebug('Password recovery mode activated');
        setTokenValid(true);
        setSuccessMessage('You can now set your new password');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Also check for hash fragment which might contain the token
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashToken =
      hashParams.get('token') ||
      hashParams.get('code') ||
      hashParams.get('token_hash');

    if (hashToken && !token) {
      logDebug('Found token in URL hash fragment:', hashToken);
      // Optionally, you could update the state or reload the page with the token as a query param
    }
  }, [token]);

  const form = useForm<NewPasswordSchemaType>({
    resolver: zodResolver(getNewPasswordSchema()),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: NewPasswordSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);

      // Use Supabase's updateUser method directly
      // The token is already processed by the onAuthStateChange handler
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Clear the must_change_password flag if user is logged in
      if (user) {
        const { error: profileError } = await supabase
          .from('mp_profiles')
          .update({ must_change_password: false })
          .eq('id', user.id);

        if (profileError) {
          console.error('Error clearing must_change_password flag:', profileError);
        }
      }

      // Set success message
      setSuccessMessage('Password changed successfully!');

      // Reset form
      form.reset();

      // Redirect based on context
      setTimeout(() => {
        if (user && role) {
          // User is logged in, redirect to their dashboard
          switch (role) {
            case 'supervisor':
              navigate('/supervisor/dashboard');
              break;
            case 'program-member':
              navigate('/program-member/dashboard');
              break;
            default:
              navigate('/');
          }
        } else {
          // User is not logged in (password reset via email), redirect to login
          navigate('/auth/signin');
        }
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  // If user is logged in, allow them to change password without token
  // This handles the forced password change flow
  const isLoggedIn = !!user;
  
  if (!token && !tokenValid && !isLoggedIn) {
    return (
      <Card className="max-w-[400px] w-full mx-auto">
        <CardContent className="p-6 lg:p-8 space-y-5">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight uppercase tracking-widest text-gray-900">Reset Password</h1>
            <p className="text-sm text-muted-foreground">
              You need a valid reset link to change your password
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-xl border border-border">
            <h3 className="text-xs font-bold uppercase mb-2">How to reset:</h3>
            <ol className="list-decimal ms-4 text-xs space-y-1 text-muted-foreground font-medium">
              <li>Request a password reset link via email</li>
              <li>Check your email inbox and spam folder</li>
              <li>Click the reset link in the email you receive</li>
              <li>Create a new password on the page that opens</li>
            </ol>
          </div>

          <Button asChild className="w-full h-11 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">
            <Link to="/auth/reset-password">Request a Reset Link</Link>
          </Button>

          <div className="text-center text-xs mt-4 font-bold">
            <span className="text-muted-foreground uppercase tracking-tight">Remember your password?</span>{' '}
            <Link to="/auth/signin" className="text-primary hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-[400px] w-full mx-auto">
      <CardContent className="p-6 lg:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight uppercase tracking-widest text-gray-900">
                {isLoggedIn && !token ? 'Update Password' : 'Set New Password'}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isLoggedIn && !token 
                  ? 'You are required to change your password before continuing.'
                  : 'Create a strong password for your account.'
                }
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertIcon>
                  <AlertCircle className="h-4 w-4" />
                </AlertIcon>
                <AlertTitle className="text-xs">{error}</AlertTitle>
              </Alert>
            )}

            {successMessage && (
              <Alert>
                <AlertIcon>
                  <Check className="h-4 w-4 text-green-500" />
                </AlertIcon>
                <AlertTitle className="text-xs">{successMessage}</AlertTitle>
              </Alert>
            )}

            <div className="space-y-4 font-bold uppercase tracking-widest">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black text-gray-500">New Password</FormLabel>
                    <div className="relative">
                      <Input
                        placeholder="Create a strong password"
                        type={passwordVisible ? 'text' : 'password'}
                        autoComplete="new-password"
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
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black text-gray-500">Confirm Password</FormLabel>
                    <div className="relative">
                      <Input
                        placeholder="Verify your password"
                        type={confirmPasswordVisible ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...field}
                        className="h-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        mode="icon"
                        onClick={() =>
                          setConfirmPasswordVisible(!confirmPasswordVisible)
                        }
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      >
                        {confirmPasswordVisible ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={isProcessing}>
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Updating...
                </span>
              ) : (
                'Save New Password'
              )}
            </Button>

            <div className="text-center mt-4">
              <Link to="/auth/signin" className="text-xs font-bold text-primary hover:underline uppercase tracking-tight">
                Back to Sign In
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default ChangePasswordPage;
