import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
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
import { getSignupSchema, SignupSchemaType } from '../forms/signup-schema';

export function SignUpPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<SignupSchemaType>({
    resolver: zodResolver(getSignupSchema()),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      terms: false,
    },
  });

  async function onSubmit(values: SignupSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);

      // Register the user with Supabase
      await register(
        values.email,
        values.password,
        values.confirmPassword,
        values.firstName,
        values.lastName
      );

      // Set success message
      setSuccessMessage(
        'Registration successful! Please check your email to confirm your account.',
      );

      // Optionally redirect to login page after a delay
      setTimeout(() => {
        navigate('/auth/signin');
      }, 3000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred during registration. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Card className="max-w-[400px] w-full mx-auto">
      <CardContent className="p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="block w-full space-y-5"
          >
            <div className="text-center space-y-1 pb-3">
              <h1 className="text-2xl font-semibold tracking-tight">Sign Up</h1>
              <p className="text-sm text-muted-foreground">
                Create your account to get started
              </p>
            </div>

            {error && (
              <Alert
                variant="destructive"
                appearance="light"
                onClose={() => setError(null)}
              >
                <AlertIcon>
                  <AlertCircle />
                </AlertIcon>
                <AlertTitle className="text-xs">{error}</AlertTitle>
              </Alert>
            )}

            {successMessage && (
              <Alert appearance="light" onClose={() => setSuccessMessage(null)}>
                <AlertIcon>
                  <Check />
                </AlertIcon>
                <AlertTitle className="text-xs">{successMessage}</AlertTitle>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-500">First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-500">Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Last Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-500">Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your email address"
                      type="email"
                      {...field}
                    />
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
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-500">Password</FormLabel>
                  <div className="relative">
                    <Input
                      placeholder="Create a password"
                      type={passwordVisible ? 'text' : 'password'}
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
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-500">Confirm Password</FormLabel>
                  <div className="relative">
                    <Input
                      placeholder="Verify your password"
                      type={confirmPasswordVisible ? 'text' : 'password'}
                      {...field}
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

            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-0.5 space-y-0 rounded-md">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none ml-2">
                    <FormLabel className="text-xs font-bold text-muted-foreground">
                      I agree to the{' '}
                      <Link
                        to="#"
                        className="text-primary hover:underline"
                      >
                        Privacy Policy
                      </Link>
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-11 font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={isProcessing}>
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="text-center text-xs text-muted-foreground mt-4">
              Already have an account?{' '}
              <Link
                to="/auth/signin"
                className="font-bold text-primary hover:underline"
              >
                Sign In
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
