import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Shield, Lock, RefreshCw } from 'lucide-react';

interface BusinessPricingPageProps {
  onNavigate?: (path: string) => void;
}

const tiers = [
  {
    key: 'clinical',
    title: 'Clinical SaaS',
    label: 'Clinics & Health Systems',
    desc: 'Embed validated PHQ-9 screening into your clinical workflow.',
    monthly: 199,
    annual: 149,
    annualTotal: 1788,
    perLabel: 'per provider / month',
    cta: 'Explore Options',
    dark: false,
    featured: false,
    features: [
      'Patient screening at scale',
      'PHQ-9 results dashboard',
      'AI summary & clinical decision support',
      'Care planning integration',
      'Follow-up monitoring & alerts',
      'EHR-ready data export',
      'HIPAA-compliant infrastructure',
    ],
  },
  {
    key: 'employer',
    title: 'Employers & Organizations',
    label: 'HR & People Teams',
    desc: 'Voluntary, anonymous screening that protects employee privacy.',
    monthly: 299,
    annual: 224,
    annualTotal: 2688,
    perLabel: 'per organization / month',
    cta: 'Explore Options',
    dark: false,
    featured: false,
    features: [
      'Voluntary employee screening',
      'Individual results stay private',
      'De-identified workforce analytics',
      'Wellbeing program referrals',
      'Trend tracking across departments',
      'Admin dashboard & reporting',
      'SSO & custom branding available',
    ],
  },
  {
    key: 'public',
    title: 'Public Health',
    label: 'Health Authorities',
    desc: 'Population-level mental health data for policy and programs.',
    monthly: 499,
    annual: 374,
    annualTotal: 4488,
    perLabel: 'per region / month',
    cta: 'Explore Options',
    dark: false,
    featured: false,
    features: [
      'Population screening programs',
      'Data aggregation & cohort analysis',
      'Analytics dashboard',
      'Longitudinal trend analysis',
      'Policy decision support reports',
      'Multi-region deployment',
      'Research-grade data export',
    ],
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export function BusinessPricingPage({ onNavigate }: BusinessPricingPageProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <motion.div
      className="max-w-5xl mx-auto px-6 py-16"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className="text-center mb-10">
        <motion.div variants={fadeUp}>
          <span className="inline-block bg-sage-100 text-sage-600 text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wide border border-sage-200/60">
            For Business
          </span>
        </motion.div>
        <motion.h1
          variants={fadeUp}
          className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-ink tracking-tight mb-3 leading-tight"
        >
          Mental health infrastructure<br className="hidden md:block" />
          built for organizations
        </motion.h1>
        <motion.p variants={fadeUp} className="text-ink-muted text-sm md:text-base max-w-md mx-auto leading-relaxed">
          Deploy MAEDOT across your clinic, workforce, or public health program.
          Compliant, private, and clinically validated.
        </motion.p>
      </div>

      {/* Billing toggle */}
      <motion.div variants={fadeUp} className="flex justify-center mb-10">
        <div className="relative inline-flex items-center bg-ivory-200 rounded-full p-1 gap-0">
          <motion.div
            className="absolute top-1 bottom-1 rounded-full bg-ink"
            layout
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{ left: isAnnual ? '50%' : '4px', right: isAnnual ? '4px' : '50%' }}
          />
          <button
            onClick={() => setIsAnnual(false)}
            className={`relative z-10 px-5 py-2 text-sm font-semibold rounded-full transition-colors duration-200 cursor-pointer ${!isAnnual ? 'text-sage-400' : 'text-ink-muted'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`relative z-10 px-5 py-2 text-sm font-semibold rounded-full transition-colors duration-200 flex items-center gap-2 cursor-pointer ${isAnnual ? 'text-sage-400' : 'text-ink-muted'}`}
          >
            Annual
            <span className="bg-amber-400 text-ink text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              Save 25%
            </span>
          </button>
        </div>
      </motion.div>

      {/* Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {tiers.map((tier) => (
          <motion.div
            key={tier.key}
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`rounded-2xl flex flex-col overflow-hidden ${
              tier.dark
                ? 'bg-ink'
                : 'bg-white border border-ivory-300 shadow-warm-md'
            } ${tier.featured ? 'shadow-[0_0_0_2px_#4A8A63,0_8px_48px_rgba(26,26,26,0.18)]' : ''}`}
          >
            <div className="p-6 md:p-8 flex flex-col flex-1">
              {tier.badge && (
                <span className="text-xs font-semibold tracking-wide text-sage-400 mb-2 block">
                  {tier.badge}
                </span>
              )}
              <h2 className={`font-display text-xl font-bold mb-2 leading-snug ${tier.dark ? 'text-ivory-100' : 'text-ink'}`}>
                {tier.title}
              </h2>
              <span className={`text-[10px] font-mono font-bold tracking-widest uppercase mb-1 ${tier.dark ? 'text-sage-400' : 'text-ink-muted'}`}>
                {tier.label}
              </span>
              
              <p className={`text-xs leading-relaxed mb-5 ${tier.dark ? 'text-ivory-200/60' : 'text-ink-muted'}`}>
                {tier.desc}
              </p>
              <p className={`text-xs font-bold leading-relaxed mb-2 ${tier.dark ? 'text-ivory-200/60' : 'text-ink-muted'}`}>Strating from</p>

              {/* Price */}
              <div className="mb-1 min-h-[64px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isAnnual ? `${tier.key}-annual` : `${tier.key}-monthly`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className={`font-display text-4xl font-bold ${tier.dark ? 'text-ivory-100' : 'text-ink'}`}>
                        ${isAnnual ? tier.annual : tier.monthly}
                      </span>
                      <span className={`text-sm ${tier.dark ? 'text-ivory-200/60' : 'text-ink-light'}`}>
                        /month
                      </span>
                    </div>
                    {isAnnual && (
                      <p className={`text-xs mt-0.5 ${tier.dark ? 'text-sage-400' : 'text-ink-muted'}`}>
                        billed ${tier.annualTotal.toLocaleString()}/yr
                      </p>
                    )}
                    <p className={`text-[11px] mt-1 ${tier.dark ? 'text-ivory-200/40' : 'text-ink-light'}`}>
                      {tier.perLabel}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className={`border-t my-5 ${tier.dark ? 'border-ivory-50/10' : 'border-ivory-200'}`} />

              <ul className="space-y-2.5 mb-6 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className={`flex items-start gap-2.5 text-sm ${tier.dark ? 'text-ivory-100/95' : 'text-ink-soft'}`}>
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${tier.dark ? 'text-sage-400' : 'text-sage-600'}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  tier.dark
                    ? 'bg-ivory-50 text-ink hover:bg-ivory-200'
                    : 'bg-sage-600 hover:bg-sage-700 text-white'
                }`}
              >
                {tier.cta} →
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Savings callout */}
      <motion.div
        variants={fadeUp}
        className="bg-amber-100 border border-amber-200 rounded-xl px-5 py-4 text-center mb-10"
      >
        <p className="text-sm text-ink-soft">
          Annual billing saves up to <strong className="font-semibold">$900/year</strong> on the Public Health plan —
          the equivalent of two months free.
        </p>
      </motion.div>

      {/* Trust row */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Shield,    text: 'Cancel anytime — no questions asked' },
          { icon: Lock,      text: 'Individual results never reach admins' },
          { icon: RefreshCw, text: 'Downgrade or pause from your dashboard' },
        ].map((item) => (
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

export default BusinessPricingPage;