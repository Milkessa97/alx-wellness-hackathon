import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { BookingForm } from '../../components/referral/BookingForm';
import { ReferralStatus } from '../../components/referral/ReferralStatus';
import { SignInButton } from '../../components/auth/SignInButton';
import { UserMenu } from '../../components/auth/UserMenu';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export function BookReferralPage() {
  const { status, data: session } = useSession();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [bookingContext, setBookingContext] = useState<{ score: number; tier: string } | null>(null);
  const [isCheckingContext, setIsCheckingContext] = useState(true);

  // Authenticate session and check sessionStorage key "maedot_booking_context"
  useEffect(() => {
    if (status === 'authenticated') {
      try {
        const stored = sessionStorage.getItem('maedot_booking_context');
        if (stored) {
          setBookingContext(JSON.parse(stored));
          setIsCheckingContext(false);
        } else {
          // If missing booking context, redirect to /assessment
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/assessment');
            window.dispatchEvent(new Event('navigationchange'));
          }
        }
      } catch (err) {
        console.error('Error loading booking context from session storage:', err);
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', '/assessment');
          window.dispatchEvent(new Event('navigationchange'));
        }
      }
    } else if (status === 'unauthenticated') {
      setIsCheckingContext(false);
    }
  }, [status]);

  const handleBookingSuccess = () => {
    // Increment trigger to update the ReferralStatus card component dynamically
    setRefreshTrigger(prev => prev + 1);
  };

  const handleNavigateHome = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new Event('navigationchange'));
    }
  };

  // Loading state
  if (status === 'loading' || (status === 'authenticated' && isCheckingContext)) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center font-body">
        <div className="w-8 h-8 border-2 border-t-transparent border-sage-600 rounded-full animate-spin mb-3" />
        <p className="text-xs text-ink-muted select-none font-mono">Verifying credentials...</p>
      </div>
    );
  }

  // Gate 1: If not signed-in, show sign-in prompt card
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white border border-ivory-200 rounded-3xl p-8 text-center space-y-6 shadow-warm-md"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-sage-50 text-sage-600 border border-sage-200/50 flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <div className="space-y-2 select-none">
            <h2 className="font-display font-extrabold text-2xl text-ink tracking-tight">
              Sign in to book an appointment
            </h2>
            <p className="text-sm text-ink-muted leading-relaxed font-body">
              We need your account to track your referral status.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <SignInButton />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-body text-left">
      {/* Header section with back controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none pb-4 border-b border-ivory-200">
        <div>
          <button
            onClick={handleNavigateHome}
            className="text-xs font-bold text-sage-600 hover:text-sage-700 font-mono tracking-wide uppercase flex items-center gap-1.5 focus:outline-none mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h2 className="font-display font-bold text-2xl md:text-3xl text-ink leading-tight">
            Clinic Referrals Portal
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Book telemedicine evaluations, counseling consultations, or match with partner providers privately.
          </p>
        </div>

        <div className="shrink-0 z-20">
          <UserMenu />
        </div>
      </div>

      {/* Main Grid: Form Left, Status Card Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column occupies 7/12 area */}
        <div className="lg:col-span-7">
          <BookingForm 
            score={bookingContext?.score ?? 0}
            tier={bookingContext?.tier ?? 'safe'}
            onSuccess={handleBookingSuccess} 
          />
        </div>

        {/* Right column occupies 5/12 area */}
        <div className="lg:col-span-5">
          <ReferralStatus onRefreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}

export default BookReferralPage;
