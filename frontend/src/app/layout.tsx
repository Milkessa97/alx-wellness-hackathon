import React, { useEffect } from 'react';
import { HeartPulse, ShieldCheck, Heart } from 'lucide-react';
import { Lora, DM_Sans } from 'next/font/google';
import { AnimatePresence, motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { SignInButton } from '../components/auth/SignInButton';
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
  const { status } = useSession();

  // Apply font variables and metadata page tags on component mount
  useEffect(() => {
    document.title = metadata.title;
    
    // Set custom emoji favicon dynamically
    let faviconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!faviconLink) {
      faviconLink = document.createElement('link');
      faviconLink.rel = 'icon';
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E❤️%3C/text%3E%3C/svg%3E';

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', metadata.description);

    // Set CSS variable properties on documentElement
    document.documentElement.style.setProperty('--font-display', lora.style.fontFamily);
    document.documentElement.style.setProperty('--font-body', dmSans.style.fontFamily);
    
    // Set custom classes
    document.documentElement.className = `${lora.variable} ${dmSans.variable}`;
  }, []);

  const handleSignOut = async () => {
    await signOut({
      callbackUrl: '/',
    });
  };
  return (
    <div className="min-h-screen bg-ivory-100 text-ink flex flex-col font-body transition-colors duration-300 selection:bg-amber-200">
      {/* Header navbar - Fixed top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-ivory-50 shadow-warm-sm h-[56px] border-b border-ivory-100">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Left: MAEDOT wordmark linking to home */}
          <button 
            onClick={onNavigateHome}
            className="font-display font-black tracking-wider text-lg text-ink focus:outline-none cursor-pointer hover:opacity-80 transition-opacity"
          >
            MAEDOT
          </button>

          {/* Right: UserMenu (automatically renders login button if not authenticated) */}
          <div className="flex items-center gap-3">
  <button
    onClick={() => {
      window.history.pushState({}, '', '/assessment');
      window.dispatchEvent(new Event('navigationchange'));
    }}
    className="text-xs font-bold text-sage-600 hover:text-sage-700 transition-colors cursor-pointer"
  >
    New Check-in
  </button>

  <button
    onClick={onNavigateToHistory}
    className="text-xs font-semibold text-ink-muted hover:text-ink transition-colors cursor-pointer"
  >
    Trends & History
  </button>

  <button
    onClick={() => {
      window.history.pushState({}, '', '/pricing');
      window.dispatchEvent(new Event('navigationchange'));
    }}
    className="text-xs font-semibold text-ink-muted hover:text-ink transition-colors cursor-pointer"
  >
    Pricing
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
        </div>
      </header>

      {/* Main body wrapping content (offsetting for the fixed navbar height of 56px) */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-4 pt-[80px] pb-8 md:pb-12 relative">
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
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-ink-light font-body">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <p className="font-display font-bold text-sm text-ink-soft">
              Reflect • Clinical Self-Evaluation
            </p>
            <p className="text-ink-muted/80 text-[11px] leading-relaxed max-w-md mt-1">
              An educational implementation of the validated Patient Health Questionnaire (PHQ-9). Built for ultimate privacy, no personal screening results are ever sent to an external server.
            </p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span>Made with care for therapeutic support</span>
              <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600 animate-pulse-soft" />
            </div>
            <p className="text-[10px] font-mono text-sage-600 bg-sage-100 px-2 py-0.5 border border-sage-200/40 rounded-md">
              Secure Sandbox
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default RootLayout;
