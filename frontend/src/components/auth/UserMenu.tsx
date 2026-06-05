import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'motion/react';
import SignInButton from './SignInButton';

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return (
      <div className="w-8 h-8 rounded-full border border-ivory-300 bg-white/50 flex items-center justify-center select-none">
        <div className="w-4 h-4 border-2 border-t-transparent border-sage-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) {
    return <SignInButton />;
  }

  // Find user initial
  const initial = session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U';

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('navigationchange'));
    }
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Shows user avatar initial in a circle (ink bg, ivory text) */}
      <button
        id="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full bg-ink text-ivory-50 flex items-center justify-center font-bold font-sans text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-sage-500 cursor-pointer select-none"
      >
        {initial}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="user-menu-dropdown"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-56 bg-white border border-ivory-200 rounded-xl shadow-warm-md overflow-hidden z-50 py-1"
          >
            {/* User name (bold) + email (muted) at top */}
            <div className="px-4 py-2.5 border-b border-ivory-100 text-left">
              <div className="text-xs font-bold text-ink-soft select-none truncate">
                {session.user.name}
              </div>
              <div className="text-[10px] text-ink-muted select-none truncate mt-0.5">
                {session.user.email}
              </div>
            </div>

            {/* "Dashboard" link and "My History" link */}
            <div className="py-1">
              <button
                id="menu-link-dashboard"
                onClick={() => handleNavigate('/dashboard')}
                className="w-full text-left px-4 py-2 text-xs text-ink-soft hover:bg-ivory-50 transition-colors cursor-pointer block font-semibold"
              >
                Dashboard
              </button>
              <button
                id="menu-link-history"
                onClick={() => handleNavigate('/history')}
                className="w-full text-left px-4 py-2 text-xs text-ink-soft hover:bg-ivory-50 transition-colors cursor-pointer block font-semibold"
              >
                My History
              </button>
            </div>

            {/* Divider and "Sign out" button calling signOut() */}
            <div className="border-t border-ivory-100 pt-1 mt-1">
              <button
                id="menu-btn-signout"
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50/70 transition-colors cursor-pointer block font-bold"
              >
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UserMenu;
