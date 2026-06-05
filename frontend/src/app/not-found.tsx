import { ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

interface NotFoundProps {
  onGoHome?: () => void;
}

export function NotFound({ onGoHome }: NotFoundProps) {
  const handleRedirect = () => {
    if (onGoHome) {
      onGoHome();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col justify-center items-center text-center px-6 py-12 relative overflow-hidden select-none">
      
      {/* Soft Floating/Pulsing Shape Background Decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-sage-100/40 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 space-y-6 max-w-md">
        {/* Large 404 text in font-display */}
        <h1 className="font-display font-black text-8xl md:text-9xl text-ivory-300 leading-none select-none tracking-tight">
          404
        </h1>

        <div className="space-y-2">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl text-ink leading-tight">
            This page doesn't exist.
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed font-body">
            We couldn't find the reflection guide or page you were search of. Let's redirect you back to safety.
          </p>
        </div>

        <div className="pt-4 flex justify-center">
          <Button 
            onClick={handleRedirect}
            variant="primary"
            className="flex items-center gap-2 font-sans font-bold shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Go home
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NotFound;
