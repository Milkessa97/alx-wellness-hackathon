import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Shield, Lock, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

// Stripe price IDs from environment
const PRICE_MONTHLY = (import.meta as any).env?.VITE_STRIPE_PRICE_MONTHLY || 'price_monthly';
const PRICE_ANNUAL = (import.meta as any).env?.VITE_STRIPE_PRICE_ANNUAL || 'price_annual';

// ── Feature list data ────────────────────────────────────────────────────
const freeFeatures = [
  'PHQ-9 assessment every 14 days',
  'AI-generated reflection',
  'Crisis resources always available',
  'Last 3 check-ins visible',
  'Basic encouragement notes',
  'Clinic referral booking',
];

const premiumOnlyFeatures = [
  'Full history & trend analytics',
  'Coping task selection',
  'Daily reminders',
  'Streak tracking',
  'PDF export',
];

const allPremiumFeatures = [
  'Everything in Free',
  'Full history & trend analytics',
  'Coping task selection',
  'Daily reminders',
  'Streak tracking',
  'PDF export',
  'Priority clinic matching',
];

// ── Trust row items ──────────────────────────────────────────────────────
const trustItems = [
  { icon: Shield, text: 'Cancel anytime — no questions asked' },
  { icon: Lock,   text: 'Secured by Stripe — we never see your card' },
  { icon: RefreshCw, text: 'Downgrade instantly from your profile' },
];

// ── Stagger animation variants ──────────────────────────────────────────
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// ── Component ────────────────────────────────────────────────────────────
interface PricingPageProps {
  onNavigate?: (path: string) => void;
}

export function PricingPage({ onNavigate }: PricingPageProps) {
  const { data: session, status } = useSession();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSignedIn = status === 'authenticated';
  // We don't have tier info in the session object directly, so we treat
  // the subscription-status endpoint as the source of truth if needed.
  // For the CTA rendering, we default to 'free' for signed-in users
  // since premium users rarely visit the pricing page.
  const userTier = (session?.user as any)?.tier || 'free';

  const selectedPriceId = isAnnual ? PRICE_ANNUAL : PRICE_MONTHLY;

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new Event('navigationchange'));
    }
  };

  // ── Upgrade handler ──────────────────────────────────────────────────
  const handleUpgrade = async () => {
    if (!isSignedIn) {
      navigateTo('/?signin=true');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/stripe/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.token}`,
        },
        body: JSON.stringify({
          price_id: selectedPriceId,
          success_url: `${APP_URL}/dashboard?upgraded=true`,
          cancel_url: `${APP_URL}/pricing`,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await res.json();
      window.location.href = data.checkout_url;
    } catch (err) {
      console.error('Checkout error:', err);
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header section ──────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <motion.div variants={fadeUp}>
          <span className="inline-block bg-sage-100 text-sage-600 text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wide">
            Simple, transparent pricing
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-ink tracking-tight mb-3"
        >
          Invest in yourself.
        </motion.h1>

        <motion.p variants={fadeUp} className="text-ink-muted text-sm md:text-base max-w-md mx-auto">
          Start free. Upgrade when you're ready. Cancel anytime.
        </motion.p>
      </div>

      {/* ── Billing toggle ──────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex justify-center mb-10">
        <div className="relative inline-flex items-center bg-ivory-200 rounded-full p-1 gap-0">
          {/* Sliding pill background */}
          <motion.div
            className="absolute top-1 bottom-1 rounded-full bg-ink"
            layout
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              left: isAnnual ? '50%' : '4px',
              right: isAnnual ? '4px' : '50%',
            }}
          />

          <button
            onClick={() => setIsAnnual(false)}
            className={`relative z-10 px-5 py-2 text-sm font-semibold rounded-full transition-colors duration-200 cursor-pointer ${
              !isAnnual ? 'text-sage-400' : 'text-ink-muted'
            }`}
          >
            Monthly
          </button>

          <button
            onClick={() => setIsAnnual(true)}
            className={`relative z-10 px-5 py-2 text-sm font-semibold rounded-full transition-colors duration-200 flex items-center gap-2 cursor-pointer ${
              isAnnual ? 'text-sage-400' : 'text-ink-muted'
            }`}
          >
            Annual
            <span className="bg-amber-400 text-ink text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              Save 35%
            </span>
          </button>
        </div>
      </motion.div>

      {/* ── Pricing cards ───────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10"
      >
        {/* ── Free card ──────────────────────────────────────────── */}
        <motion.div
          className="bg-white border border-ivory-300 rounded-2xl p-6 md:p-8 shadow-warm-md flex flex-col"
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <h2 className="font-display text-xl font-bold text-ink mb-1">Free</h2>
          <div className="mb-4">
            <span className="font-display text-4xl font-bold text-ink">$0</span>
            <span className="text-ink-light text-sm ml-1.5">forever</span>
          </div>

          <div className="border-t border-ivory-200 my-4" />

          {/* Included features */}
          <ul className="space-y-2.5 mb-4 flex-grow">
            {freeFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-soft">
                <Check className="w-4 h-4 text-sage-600 mt-0.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {/* Excluded features */}
          <ul className="space-y-2.5 mb-6">
            {premiumOnlyFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-ink-light/60">
                <X className="w-4 h-4 text-ink-light/40 mt-0.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          {!isSignedIn && (
            <Button
              variant="ghost"
              fullWidth
              size="lg"
              onClick={() => navigateTo('/assessment')}
            >
              Get started free
            </Button>
          )}
          {isSignedIn && userTier === 'free' && (
            <Button
              variant="ghost"
              fullWidth
              size="lg"
              disabled
            >
              Your current plan
            </Button>
          )}
        </motion.div>

        {/* ── Premium card ───────────────────────────────────────── */}
        <motion.div
          className="bg-ink rounded-2xl p-6 md:p-8 flex flex-col relative overflow-hidden"
          style={{ boxShadow: '0 0 0 2px #4A8A63, 0 8px 48px rgba(26,26,26,0.18)' }}
          whileHover={{ y: -4 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {/* Popular badge */}
          <span className=" text-xs font-semibold tracking-wide mb-2">
            Most popular
          </span>

          <h2 className="font-display text-xl font-bold mb-1">Premium</h2>

          {/* Animated price swap */}
          <div className="mb-1 min-h-[56px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={isAnnual ? 'annual' : 'monthly'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                {isAnnual ? (
                  <div>
                    <span className="font-display text-4xl font-bold ">$3.25</span>
                    <span className="text-sm ml-1.5">/month</span>
                    <p className=" text-xs mt-0.5">(billed $39/yr)</p>
                  </div>
                ) : (
                  <div>
                    <span className="font-display text-4xl font-bold">$4.99</span>
                    <span className=" text-sm ml-1.5">/month</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="text-sage-400 text-xs mb-4">
            14-day free trial — no card required
          </p>

          <div className="border-t border-ivory-50/10 my-4" />

          {/* All features */}
          <ul className="space-y-2.5 mb-6 flex-grow">
            {allPremiumFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm ">
                <Check className="w-4 h-4 text-sage-400 mt-0.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Button
            variant="primary"
            fullWidth
            size="lg"
            loading={loading}
            onClick={handleUpgrade}
            className="!bg-ivory-50 !text-ink hover:!bg-ivory-200 !border-transparent"
          >
            {loading ? 'Redirecting...' : 'Start free trial →'}
          </Button>
        </motion.div>
      </motion.div>

      {/* ── Annual savings callout ──────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="bg-amber-100 border border-amber-200 rounded-xl px-5 py-4 text-center mb-10"
      >
        <p className="text-sm text-ink-soft">
          At <strong className="font-semibold">$39/year</strong>, Premium pays for itself after 8 months of monthly billing.
        </p>
      </motion.div>

      {/* ── Trust row ───────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4"
      >
        {trustItems.map((item) => (
          <div
            key={item.text}
            className="flex items-center gap-3 bg-ivory-50 border border-ivory-200 rounded-xl px-4 py-3"
          >
            <item.icon className="w-5 h-5 text-sage-600 shrink-0" />
            <span className="text-xs text-ink-muted leading-tight">{item.text}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

export default PricingPage;
