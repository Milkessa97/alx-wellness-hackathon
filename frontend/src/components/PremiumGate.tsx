import React from 'react';
import { useSession } from 'next-auth/react';
import { Lock } from 'lucide-react';

interface PremiumGateProps {
  children: React.ReactNode;
  featureName: string;
}

// SPA navigation: matches the existing custom-router pattern used across the
// app (pushState + a 'navigationchange' event that App.tsx listens for).
function navigateTo(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('navigationchange'));
}

function PremiumGate({ children, featureName }: PremiumGateProps) {
  const { data: session, status } = useSession();

  // Loading → skeleton placeholder roughly the height of the gated content.
  if (status === 'loading') {
    return (
      <div className="space-y-3" aria-hidden="true">
        <div className="h-6 w-3/4 rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-6 w-full rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-6 w-5/6 rounded-lg bg-gray-200 animate-pulse" />
      </div>
    );
  }

  const tier = (session?.user as any)?.tier;

  // Premium → render the gated content untouched.
  if (tier === 'premium') {
    return <>{children}</>;
  }

  // Everyone else → upgrade card.
  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-8 text-center">
      <Lock className="mx-auto mb-3 h-8 w-8 text-amber-500" />
      <p className="font-semibold text-amber-700">✦ Premium Feature</p>
      <p className="mt-2 text-sm text-amber-700/80">
        Unlock {featureName} by upgrading to Premium
      </p>
      <button
        type="button"
        onClick={() => navigateTo('/pricing')}
        className="mt-5 rounded-full bg-amber-500 px-6 py-2 text-white hover:bg-amber-600"
      >
        Upgrade to Premium
      </button>
    </div>
  );
}

export default PremiumGate;
