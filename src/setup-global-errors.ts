import { logError } from '@/lib/logger';

/**
 * Catches unhandled runtime exceptions (e.g., undefined is not a function)
 */
window.addEventListener('error', (event) => {
  logError({
    message: event.message || 'Unhandled Runtime Error',
    stack: event.error?.stack,
    componentName: 'GlobalWindowListener',
    severity: 'error',
  });
});

/**
 * Catches unhandled promise rejections (e.g., failed fetch requests not caught by a catch block)
 */
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const message = typeof reason === 'string' ? reason : (reason?.message || 'Unhandled Promise Rejection');
  const stack = reason?.stack;

  logError({
    message,
    stack,
    componentName: 'GlobalPromiseListener',
    severity: 'error',
    metadata: { reason: JSON.stringify(reason) },
  });
});
