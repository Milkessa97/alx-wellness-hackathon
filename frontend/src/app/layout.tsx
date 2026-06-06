import React, { useEffect, useState } from 'react';
import { HeartPulse, ShieldCheck, Heart } from 'lucide-react';
import { Lora, DM_Sans } from 'next/font/google';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SignInButton } from '../components/auth/SignInButton';
import { SignInModal } from '../components/auth/SignInModal';
import { UserMenu } from '../components/auth/UserMenu';
import { signOut } from 'next-auth/react';

export const metadata = {
  title: "Reflect — Wellness Self-Check",
  description: "A private psychoeducational self-reflection tool",
  icons: {
    icon: '❤️',
  },
};

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-display',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-body',
});

interface RootLayoutProps {
  children: React.ReactNode;
  onNavigateHome: () => void;
  onNavigateToHistory: () => void;
}

export function RootLayout({ children, onNavigateHome, onNavigateToHistory }: RootLayoutProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [showSignInModal, setShowSignInModal] = useState(false);

  // After a successful sign-in, check if this is the user's first visit.
  // If they haven't seen the pricing page yet, redirect them there.
  const prevStatusRef = React.useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== 'authenticated' && status === 'authenticated') {
      const hasSeenPricing = localStorage.getItem('maedot_has_seen_pricing');
      if (!hasSeenPricing) {
        localStorage.setItem('maedot_has_seen_pricing', 'true');
        window.history.pushState({}, '', '/pricing');
        window.dispatchEvent(new Event('navigationchange'));
      }
    }
    prevStatusRef.current = status;
  }, [status]);

  // Apply font variables and metadata page tags on component mount
  useEffect(() => {
  document.documentElement.style.setProperty(
    "--font-display",
    lora.style.fontFamily
  );

  document.documentElement.style.setProperty(
    "--font-body",
    dmSans.style.fontFamily
  );

  document.documentElement.className =
    `${lora.variable} ${dmSans.variable}`;
}, []);

  const handleSignOut = async () => {
    await signOut({
      callbackUrl: '/',
    });
  };

  // Shared styling for the text nav links: neutral by default, sage + underlined
  // when that link's route is the active one.
  const navLinkClass = (isActive: boolean) =>
    [
      'relative text-xs font-semibold py-1.5 cursor-pointer transition-all',
      'after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-sage-600 after:transition-transform',
      isActive
        ? 'text-sage-600 after:scale-x-100'
        : 'text-ink-muted hover:text-ink after:scale-x-0 hover:after:scale-x-100',
    ].join(' ');

  return (
    <div className="min-h-screen bg-ivory-100 text-ink flex flex-col font-body transition-colors duration-300 selection:bg-amber-200">
      {/* Header navbar - Fixed top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-ivory-50 shadow-warm-sm h-[56px] border-b border-ivory-100">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          {/* Left: MAEDOT wordmark linking to home */}
          <button 
            onClick={onNavigateHome}
            className="font-display font-black tracking-wider text-lg text-ink focus:outline-none cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img 
              src="/Logo.png" 
              alt="MAEDOT Logo" 
              className="h-8 w-auto object-contain"
            />
          </button>

          {/* Right: UserMenu (automatically renders login button if not authenticated) */}
          <div className="flex items-center gap-6">
  <button
    onClick={() => {
      window.history.pushState({}, '', '/assessment');
      window.dispatchEvent(new Event('navigationchange'));
    }}
    className={navLinkClass(pathname === '/assessment')}
  >
    New Check-in
  </button>

  <button
    onClick={onNavigateToHistory}
    className={navLinkClass(pathname === '/history')}
  >
    Trends & History
  </button>

  <button
    onClick={() => {
      if (status !== 'authenticated') {
        setShowSignInModal(true);
      } else {
        window.history.pushState({}, '', '/pricing');
        window.dispatchEvent(new Event('navigationchange'));
      }
    }}
    className={`text-xs font-semibold px-4 py-1.5 rounded-full bg-sage-500 text-white hover:opacity-90 transition-opacity cursor-pointer ${
      pathname === '/pricing' ? 'ring-2 ring-sage-400 ring-offset-1 ring-offset-ivory-50' : ''
    }`}
  >
    Go Premium
  </button>

  <button
    onClick={() => {
      window.history.pushState({}, '', '/forbusiness');
      window.dispatchEvent(new Event('navigationchange'));
    }}
    className={navLinkClass(pathname === '/forbusiness')}
  >
    For Business
  </button>

  {status === 'authenticated' && (
    <button
  onClick={handleSignOut}
  className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
>
  Sign Out
</button>
  )}

  <UserMenu />
</div>

        {/* Sign-in modal triggered by Go Premium for unauthenticated users */}
        <SignInModal
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
          title="Sign in to explore plans"
          description="Create an account or sign in to view pricing and start your wellness journey."
        />
        </div>
      </header>

      {/* Main body wrapping content (offsetting for the fixed navbar height of 56px) */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 pt-[80px] pb-8 md:pb-12 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer support desk */}
      <footer className="bg-ivory-50 border-t border-ivory-200 py-10 mt-16 bg-gradient-to-b from-ivory-50 to-ivory-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col justify-between items-center md:flex-row gap-6">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <p className="font-display font-bold text-sm text-ink-soft">
              Reflect • Clinical Self-Evaluation
            </p>
            <p className="text-ink-muted/80 text-[11px] leading-relaxed max-w-md mt-1">
              An educational implementation of the validated Patient Health Questionnaire (PHQ-9). Private and secure — we never store your raw responses.
            </p>
          </div>

        </div>
      </footer>
    </div>
  );
}

export default RootLayout;
