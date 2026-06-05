'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';

interface ErrorBoundaryProps {
  error?: Error & { digest?: string };
  reset: () => void;
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Log the error securely for troubleshooting
    if (error) {
      console.error('Captured Runtime Error:', error);
    }
  }, [error]);

  const handleReset = () => {
    if (reset) {
      reset();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[55vh] flex items-center justify-center p-6 select-none font-body">
      <div className="w-full max-w-md bg-rose-50 border border-rose-100 rounded-3xl p-8 text-center space-y-6 shadow-sm">
        
        {/* Calm Rose-400 Warning Icon Container */}
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>

        <div className="space-y-2">
          <h3 className="font-display font-bold text-xl md:text-2xl text-ink leading-tight">
            Something went wrong on our end.
          </h3>
          <p className="text-xs md:text-sm text-ink-light leading-relaxed">
            An unexpected glitch occurred while loading your profile or analysis guidelines. Your safety and state are completely secure.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <Button
            onClick={handleReset}
            variant="danger"
            className="flex items-center gap-2 font-sans font-bold shadow-sm"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" /> Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
