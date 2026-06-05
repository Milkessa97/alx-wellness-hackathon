import { useEffect, useRef, useState } from 'react';
import { signIn, renderGoogleButton } from 'next-auth/react';
import Button from '../ui/Button';

export function SignInButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Render the official Google Identity Services button. It produces a real
  // Google credential that the auth shim exchanges for an app JWT. If GIS fails
  // to load (offline, blocked), we fall back to a styled button that triggers
  // the One Tap prompt flow instead.
  useEffect(() => {
    let cancelled = false;
    if (containerRef.current) {
      renderGoogleButton(containerRef.current)
        .then(() => {
          if (!cancelled) setRendered(true);
        })
        .catch(() => {
          if (!cancelled) setRendered(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFallbackSignIn = async () => {
    setIsPending(true);
    try {
      await signIn('google');
    } catch (e) {
      console.error('Sign in failed:', e);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="inline-flex items-center">
      {/* Official Google button mounts here when GIS is available */}
      <div ref={containerRef} />

      {/* Fallback shown only if the GIS button could not be rendered */}
      {!rendered && (
        <Button
          variant="ghost"
          size="sm"
          loading={isPending}
          onClick={handleFallbackSignIn}
          className="inline-flex items-center gap-2"
        >
          <span>Continue with Google</span>
        </Button>
      )}
    </div>
  );
}

export default SignInButton;
