'use client';

import { ReactNode, useState } from 'react';
import { RiErrorWarningFill } from '@remixicon/react';
import {
  QueryCache,
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { logError } from '@/lib/logger';

const QueryProvider = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
            gcTime: 10 * 60 * 1000, // Keep inactive data in cache for 10 minutes
            refetchOnWindowFocus: false, // Don't refetch automatically when switching tabs
            retry: 1, // Only retry failed requests once
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            logError({
              message: error.message || 'TanStack Query Error',
              stack: error.stack,
              componentName: 'QueryCache',
              severity: 'error',
            });

            const message =
              error.message || 'Something went wrong. Please try again.';

            toast.custom(
              () => (
                <Alert variant="mono" icon="destructive" close={false}>
                  <AlertIcon>
                    <RiErrorWarningFill />
                  </AlertIcon>
                  <AlertTitle>{message}</AlertTitle>
                </Alert>
              ),
              {
                position: 'top-center',
              },
            );
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            logError({
              message: error.message || 'TanStack Mutation Error',
              stack: error.stack,
              componentName: 'MutationCache',
              severity: 'error',
            });
            // We usually handle mutation toasts in the components themselves,
            // but we ensure the error is logged globally here.
          }
        })
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

export { QueryProvider };
