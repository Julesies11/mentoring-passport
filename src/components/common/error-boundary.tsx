import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/lib/logger';
import { KeenIcon } from '@/components/keenicons';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to our database
    logError({
      message: error.message || 'Unknown React Rendering Error',
      stack: errorInfo.componentStack || error.stack,
      componentName: 'GlobalErrorBoundary',
      severity: 'critical',
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="size-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-6 text-danger">
              <KeenIcon icon="information-2" className="text-3xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-500 mb-8">
              We encountered an unexpected error. Our technical team has been notified and is looking into it.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={this.handleReload}
                className="w-full bg-primary hover:bg-primary-active text-white rounded-xl h-11 font-bold transition-colors"
              >
                Reload Page
              </button>
              <button 
                onClick={this.handleGoHome}
                className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl h-11 font-bold transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
            
            {import.meta.env.DEV && this.state.error && (
              <div className="mt-8 p-4 bg-gray-50 rounded-xl text-left overflow-hidden">
                <p className="text-xs font-bold text-red-600 mb-2">Developer Detail:</p>
                <pre className="text-[10px] text-gray-600 overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
