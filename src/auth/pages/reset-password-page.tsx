import { useState } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { logDebug } from '@/lib/logger';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, MoveLeft, LoaderCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  getResetRequestSchema,
  ResetRequestSchemaType,
} from '../forms/reset-password-schema';

export function ResetPasswordPage() {
  const {} = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ResetRequestSchemaType>({
    resolver: zodResolver(getResetRequestSchema()),
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: ResetRequestSchemaType) {
    try {
      setIsProcessing(true);
      setError(null);

      logDebug('Submitting password reset for:', values.email);

      // Request password reset using Supabase directly
      const { error } = await supabase.auth.resetPasswordForEmail(
        values.email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      // Set success message
      setSuccessMessage(
        `Password reset link sent to ${values.email}! Please check your inbox and spam folder.`,
      );

      // Reset form
      form.reset();
    } catch (err) {
      console.error('Password reset request error:', err);
      setError(
        err instanceof Error
          ? `Error: ${err.message}. Please ensure your email is correct and try again.`
          : 'An unexpected error occurred. Please try again or contact support.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Card className="max-w-[400px] w-full mx-auto">
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Reset Password
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email to receive a password reset link
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

            <div className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-500">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="your.email@example.com"
                        type="email"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full h-11 font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={isProcessing}>
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </div>

            <div className="text-center mt-4">
              <Link
                to="/auth/signin"
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                <MoveLeft className="size-3.5 opacity-70" /> Back to Sign In
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
