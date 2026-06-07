import React from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { Button } from './Button';
import { SignInButton } from '../auth/SignInButton';

interface PremiumGateProps {
  children?: React.ReactNode;
  featureName: string;
  compact?: boolean;
}

function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('navigationchange'));
}

export function PremiumGate({ children, featureName, compact = false }: PremiumGateProps) {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isSignedIn = status === 'authenticated';

  // While auth is loading, render nothing to avoid flash
  if (isLoading) return null;

  // Premium users see children directly
  // The user record from the session doesn't carry tier, so we check
  // via a simple heuristic: if the user's role or a stored flag indicates
  // premium. For now, we rely on the backend tier stored in localStorage
  // alongside the session. A more robust approach would fetch
  // /api/stripe/subscription-status on mount. For the gate component we
  // read a cached tier value if available.
  const cachedTier = (() => {
    try {
      const stored = localStorage.getItem('maedot_user_tier');
      return stored || 'free';
    } catch {
      return 'free';
    }
  })();

  const tier = (session?.user as any)?.tier || cachedTier;
  const isPremium = isSignedIn && tier === 'premium';

  // Premium → render children transparently
  if (isPremium) {
    return <>{children}</>;
  }

  // ── Compact version ──────────────────────────────────────────────────
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
        <Lock className="w-3 h-3" />
        <span className="font-medium">Premium feature</span>
        {isSignedIn ? (
          <button
            onClick={() => navigateTo('/pricing')}
            className="underline underline-offset-2 hover:text-amber-700 transition-colors cursor-pointer font-semibold"
          >
            Upgrade →
          </button>
        ) : (
          <button
            onClick={() => navigateTo('/?signin=true')}
            className="underline underline-offset-2 hover:text-amber-700 transition-colors cursor-pointer font-semibold"
          >
            Sign in →
          </button>
        )}
      </span>
    );
  }

  // ── Full version ─────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-amber-100 border border-amber-200 border-l-4 border-l-amber-400 rounded-xl p-5 md:p-6 relative"
    >
      {/* Lock icon — top right */}
      <Lock className="w-5 h-5 text-amber-600 absolute top-4 right-4" />

      {/* Heading */}
      <h3 className="font-display font-bold text-base md:text-lg text-ink-soft mb-1 pr-8">
        {featureName}
      </h3>

      {/* Body */}
      <p className="text-sm text-ink-muted mb-1">
        This feature is available on MAEDOT Premium.
      </p>

      {/* Subtext */}
      <p className="text-xs text-ink-light mb-4">
        Start your 14-day free trial — no commitment.
      </p>

      {/* CTA */}
      {isSignedIn ? (
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigateTo('/pricing')}
          className="bg-sage-400 hover:bg-sage-600"
        >
          Unlock Premium →
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-ink-light">
            Sign in to access premium features
          </p>
          <SignInButton />
        </div>
      )}
    </motion.div>
  );
}

export default PremiumGate;
