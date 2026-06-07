import React, { useEffect, useState, useRef } from 'react';
import { HeartPulse, ShieldCheck, Heart, Menu, X } from 'lucide-react';
import { Lora, DM_Sans } from 'next/font/google';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SignInButton } from '../components/auth/SignInButton';
import { SignInModal } from '../components/auth/SignInModal';
import { UserMenu } from '../components/auth/UserMenu';
import { signOut } from 'next-auth/react';

export const metadata = {
  title: "MAEDOT — Wellness Self-Check",
  description: "A private psychoeducational self-reflection tool",
  icons: {
    icon: "/favicon.png",
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCancelTrial = async () => {
    if (!session?.token) return;
    setIsCanceling(true);
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_BASE}/api/stripe/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`,
        },
      });
      if (res.ok) {
        alert('Your premium trial has been dismissed. You have reverted to the free tier.');
        window.location.reload();
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Failed to cancel trial.');
      }
    } catch (err) {
      console.error('Error cancelling trial:', err);
      alert('An error occurred while cancelling your trial.');
    } finally {
      setIsCanceling(false);
      setIsMenuOpen(false);
    }
  };

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('navigationchange'));
    setIsMenuOpen(false);
  };

  const handleHistoryClick = () => {
    onNavigateToHistory();
    setIsMenuOpen(false);
  };

  const handleHomeClick = () => {
    onNavigateHome();
    setIsMenuOpen(false);
  };

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
            onClick={handleHomeClick}
            className="font-display font-black tracking-wider text-lg text-ink focus:outline-none cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img 
              src="/Logo.png" 
              alt="MAEDOT Logo" 
              className="h-8 w-auto object-contain"
            />
          </button>

          {/* Desktop navbar (visible on md screens and above) */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => navigateTo('/')}
              className={navLinkClass(pathname === '/')}
            >
              Home
            </button>
            <button
              onClick={() => navigateTo('/assessment')}
              className={navLinkClass(pathname === '/assessment')}
            >
              New Check-in
            </button>

            <button
              onClick={onNavigateToHistory}
              className={navLinkClass(pathname === '/history')}
            >
              History
            </button>

            {session?.user?.tier === 'premium' && session?.user?.is_trial ? (
              <button
                onClick={handleCancelTrial}
                disabled={isCanceling}
                className="text-xs font-semibold px-4 py-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer disabled:opacity-50 animate-pulse-custom"
              >
                {isCanceling ? 'Dismissing...' : 'Dismiss Trial'}
              </button>
            ) : session?.user?.tier !== 'premium' ? (
              <button
                onClick={() => {
                  if (status !== 'authenticated') {
                    setShowSignInModal(true);
                  } else {
                    navigateTo('/pricing');
                  }
                }}
                className={`text-xs font-semibold px-4 py-1.5 rounded-full bg-sage-600 text-white hover:opacity-90 transition-opacity cursor-pointer ${
                  pathname === '/pricing' ? 'ring-2 ring-sage-400 ring-offset-1 ring-offset-ivory-50' : ''
                }`}
              >
                Go Premium
              </button>
            ) : null}

            <button
              onClick={() => navigateTo('/forbusiness')}
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

          {/* Mobile menu trigger and dropdown (visible only below md) */}
          <div className="flex md:hidden relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center justify-center p-2 rounded-xl border border-ivory-200 bg-white text-ink-soft hover:bg-ivory-100 transition-colors cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-sage-500"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute right-0 mt-12 w-64 bg-white border border-ivory-200 rounded-2xl shadow-warm-lg overflow-hidden z-50 py-2 text-left"
                >
                  {status === 'authenticated' && session?.user && (
                    <div className="px-4 py-3 border-b border-ivory-100 flex items-center gap-3 bg-ivory-50/50">
                      <div className="w-8 h-8 rounded-full bg-ink text-ivory-50 flex items-center justify-center font-bold text-sm select-none">
                        {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="text-xs font-bold text-ink-soft truncate">{session.user.name}</div>
                        <div className="text-[10px] text-ink-muted truncate leading-tight mt-0.5">{session.user.email}</div>
                        {session.user.tier === 'premium' && (
                          <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-[9px] font-bold uppercase tracking-wider border border-sage-200/50">
                            ✦ {session.user.is_trial ? 'Premium Trial' : 'Premium'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-2 space-y-1">
                    <button
                      onClick={() => navigateTo('/')}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-ivory-50 hover:text-ink rounded-xl transition-colors cursor-pointer block"
                    >
                      Home
                    </button>
                    <button
                      onClick={() => navigateTo('/assessment')}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-ivory-50 hover:text-ink rounded-xl transition-colors cursor-pointer block"
                    >
                      New Check-in
                    </button>
                    <button
                      onClick={handleHistoryClick}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-ivory-50 hover:text-ink rounded-xl transition-colors cursor-pointer block"
                    >
                      History
                    </button>
                    <button
                      onClick={() => navigateTo('/forbusiness')}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-ivory-50 hover:text-ink rounded-xl transition-colors cursor-pointer block"
                    >
                      For Business
                    </button>
                  </div>

                  <div className="px-2 py-1 border-t border-ivory-100 mt-1">
                    {session?.user?.tier === 'premium' && session?.user?.is_trial ? (
                      <button
                        onClick={handleCancelTrial}
                        disabled={isCanceling}
                        className="w-full text-center px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/50 rounded-xl transition-colors cursor-pointer disabled:opacity-50 block"
                      >
                        {isCanceling ? 'Dismissing Trial...' : 'Dismiss Trial'}
                      </button>
                    ) : session?.user?.tier !== 'premium' ? (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (status !== 'authenticated') {
                            setShowSignInModal(true);
                          } else {
                            navigateTo('/pricing');
                          }
                        }}
                        className={`text-xs font-semibold px-4 py-1.5 rounded-full bg-sage-600 text-white hover:opacity-90 transition-opacity cursor-pointer ${
                              pathname === '/pricing' ? 'ring-2 ring-sage-400 ring-offset-1 ring-offset-ivory-50' : ''
                            }`}                      
                      >
                        Go Premium
                      </button>
                    ) : null}
                  </div>

                  <div className="border-t border-ivory-100 p-2 mt-1">
                    {status === 'authenticated' ? (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleSignOut();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50/70 rounded-xl transition-colors cursor-pointer block"
                      >
                        Sign Out
                      </button>
                    ) : (
                      <div className="flex justify-center py-1">
                        <SignInButton />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
            <p className="font-display font-bold text-sm text-ink-soft flex items-center">
              <img src="/Logo.png" alt="MAEDOT Logo" className="h-5 w-auto inline-block mr-1 -mt-0.5" />
               • Clinical Self-Evaluation
            </p>
            <p className="text-ink-muted/80 text-[11px] leading-relaxed max-w-md mt-1">
              An educational implementation of the validated Patient Health Questionnaire (PHQ-9). Built for ultimate privacy, no personal screening results are ever sent to an external server.
            </p>
          </div>

        </div>
      </footer>
    </div>
  );
}

export default RootLayout;
