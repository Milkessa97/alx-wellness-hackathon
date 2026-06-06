import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'motion/react';
import { AssessmentRecord } from '../types';
import Button from '../components/ui/Button';
import { SignInButton } from '../components/auth/SignInButton';
import { Shield, Heart, Sparkles, History } from 'lucide-react';

interface HomePageProps {
  history: AssessmentRecord[];
  onStartAssessment: () => void;
  onNavigateToHistory: () => void;
}

export function HomePage({ history, onStartAssessment, onNavigateToHistory }: HomePageProps) {
  const { data: session, status } = useSession();
  
  // Gate check-in status
  const [gateAllowed, setGateAllowed] = useState(true);
  
  // Banner state
  const [showSignInBanner, setShowSignInBanner] = useState(false);

  // Monitor waiting gate accessibility when session exists
  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchGateStatus = async () => {
      try {
        const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
        const token = (session as any)?.token;
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(`${API_BASE}/api/gate`, { headers });
        if (response.ok) {
          const data = await response.json();
          setGateAllowed(data.allowed ?? true);
        }
      } catch (err) {
        console.error('Error on HomePage fetching gate limit status:', err);
        setGateAllowed(true); // Gracefully fallback to enabled
      }
    };

    fetchGateStatus();
  }, [session, status]);

  // Handle URL sign-in target params on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('signin') === 'true') {
        setShowSignInBanner(true);
        const timer = setTimeout(() => {
          setShowSignInBanner(false);
          // Clean the query param nicely
          const url = new URL(window.location.href);
          url.searchParams.delete('signin');
          window.history.replaceState({}, '', url.pathname + url.search);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleNavigateDashboard = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new Event('navigationchange'));
    }
  };

  // Stagger variants for the heading words
  const headingContainer = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const wordVariant = {
    hidden: { y: "110%", opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  // Subheading: Fades in after words start settling
  const subheadingVariant = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.5,
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  // CTA button blooms in last
  const bloomVariant = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        delay: 1.0,
        duration: 0.7,
        ease: [0.34, 1.56, 0.64, 1], // Playful bounce-like spring curves
      },
    },
  };

  // Bottom strip items staggered fade-in
  const bottomItemVariant = (index: number) => ({
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 1.4 + index * 0.15,
        duration: 0.6,
        ease: "easeOut",
      },
    },
  });

  return (
    <div className="relative min-h-[85vh] flex flex-col justify-between items-center px-6 py-12 md:py-20 select-none overflow-hidden bg-ivory-100 font-body">
      {/* Sign-in Banner */}
      <AnimatePresence>
        {showSignInBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-40 bg-amber-100 border-b border-amber-200 text-amber-850 px-4 py-3 flex items-center justify-between shadow-sm select-none"
          >
            <div className="flex items-center gap-2 text-xs font-semibold font-sans mx-auto text-center">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              <span>Sign in to access your dashboard and track your check-ins.</span>
            </div>
            <button
              onClick={() => {
                setShowSignInBanner(false);
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('signin');
                  window.history.replaceState({}, '', url.pathname + url.search);
                }
              }}
              className="text-amber-700 hover:text-amber-900 absolute right-4 focus:outline-none p-1 shrink-0 rounded transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4% Noise Grain Texture Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.04,
        }}
        aria-hidden="true"
      />

      {/* BACKGROUND GRAPHICS: Three absolute-positioned circles strictly matching visual specs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Large sage-100 circle, top right */}
        <motion.div
          animate={{
            y: [0, -15, 0],
            x: [0, 8, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 8,
            ease: "easeInOut",
          }}
          className="absolute -top-16 -right-16 md:-top-24 md:-right-24 w-72 h-72 md:w-96 md:h-96 rounded-full bg-sage-100/60 blur-3xl"
        />

        {/* Medium amber-100 circle, bottom left (delayed float) */}
        <motion.div
          initial={{ y: 0 }}
          animate={{
            y: [0, 20, 0],
            x: [0, -10, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 10,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute -bottom-20 -left-20 md:-bottom-28 md:-left-28 w-60 h-60 md:w-80 md:h-80 rounded-full bg-amber-100/50 blur-3xl"
        />

        {/* Small ivory-300 circle, center right (soft pulse) */}
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 -right-10 w-32 h-32 md:w-44 md:h-44 rounded-full bg-ivory-300/60 blur-2xl"
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 my-auto max-w-2xl text-center space-y-8 flex flex-col items-center">
        {/* Decorative Badge */}
        <motion.span 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 0.8, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="px-3.5 py-1 bg-sage-100/80 border border-sage-200/50 text-sage-600 font-mono text-[10px] md:text-xs font-bold rounded-full tracking-widest uppercase mb-1"
        >
          Baseline Assessment Scale
        </motion.span>

        {/* Display Heading with staggered words */}
        <motion.h1
          variants={headingContainer}
          initial="hidden"
          animate="visible"
          className="font-display font-bold text-4.5xl sm:text-6xl md:text-7xl text-ink tracking-tight flex flex-wrap justify-center gap-x-3.5 gap-y-1.5 overflow-hidden"
        >
          {["How", "are", "you,", "really?"].map((word, index) => (
            <span key={index} className="inline-block overflow-hidden relative leading-normal">
              <motion.span variants={wordVariant} className="inline-block pb-1.5">
                {word
              }</motion.span>
            </span>
          ))}
        </motion.h1>

        {/* Body Subheading */}
        <motion.p
          variants={subheadingVariant}
          initial="hidden"
          animate="visible"
          className="text-base md:text-lg text-ink-light max-w-xl mx-auto leading-relaxed"
        >
          A private, 2-minute self-reflection based on the PHQ-9 scale.
        </motion.p>

        {/* Interactive CTA & Optional History Link widget */}
        <motion.div
          variants={bloomVariant}
          initial="hidden"
          animate="visible"
          className="pt-2 flex flex-col items-center gap-4 w-full max-w-sm"
        >
          {session ? (
            <div className="flex flex-col items-center gap-4 w-full select-none">
              <p className="text-sm font-semibold font-mono text-sage-700 uppercase tracking-wider">
                Welcome back, {session.user?.name?.split(' ')[0] || 'User'}.
              </p>
              
              <div className="flex flex-row items-center justify-center gap-3 w-full">
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={handleNavigateDashboard}
                  className={`${gateAllowed ? 'w-1/2' : 'w-full max-w-xs'} gap-2 bg-sage-500 hover:bg-sage-600 text-white font-sans font-semibold text-sm transition-all shadow-warm-lg`}
                >
                  Go to Dashboard
                </Button>
                {gateAllowed && (
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={onStartAssessment}
                    className="w-1/2 gap-2 bg-sage-500 hover:bg-sage-600 text-white font-sans font-semibold text-sm transition-all border-transparent"
                  >
                    New Check-in
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <Button 
                variant="primary" 
                size="lg" 
                onClick={onStartAssessment}
                className="w-full gap-2.5 bg-sage-500 hover:bg-sage-600 text-white font-sans font-semibold text-sm transition-all shadow-warm-lg"
              >
                Begin Reflection →
              </Button>

              {/* Review past sessions if they exist */}
              {history.length > 0 && (
                <button
                  onClick={onNavigateToHistory}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-sage-500 hover:bg-sage-600 text-white px-3 py-1.5 rounded-xl transition-colors uppercase tracking-wider cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  View Previous ({history.length})
                </button>
              )}

              {/* Requirement 3: If no session, add below: */}
              <div className="mt-2 flex flex-col items-center gap-2 w-full border-t border-ivory-200/50 pt-4">
                <SignInButton />
                <p className="text-[11px] font-medium text-ink-muted leading-tight font-sans text-center">
                  Sign in to track your progress over time.
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* BOTTOM STRIP: Trust indicators with staggered entry animation */}
      <div className="relative z-10 w-full max-w-4xl border-t border-ivory-200 mt-12 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 text-center">
          {[
            {
              icon: <Shield className="w-4 h-4 text-sage-600 shrink-0" />,
              text: "Private and secure — we never store your raw responses",
            },
            {
              icon: <Heart className="w-4 h-4 text-sage-600 shrink-0" />,
              text: "Based on the validated PHQ-9 scale",
            },
            {
              icon: <Sparkles className="w-4 h-4 text-sage-600 shrink-0" />,
              text: "Psychoeducational, not diagnostic",
            }
          ].map((item, index) => (
            <motion.div
              key={index}
              custom={index}
              variants={bottomItemVariant(index)}
              initial="hidden"
              animate="visible"
              className="flex items-center justify-center gap-2.5 px-4"
            >
              <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <span className="text-xs font-sans font-semibold text-ink-muted text-left">
                {item.text}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
