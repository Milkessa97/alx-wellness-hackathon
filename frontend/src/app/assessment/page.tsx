import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AssessmentRecord } from '../../types';
import AssessmentShell from '../../components/assessment/AssessmentShell';
import { GateCountdown } from '../../components/dashboard/GateCountdown';
import { motion } from 'motion/react';
import { authHeaders } from '../../lib/api';
import { ShieldCheck, Clock, Lock, HeartPulse } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

interface AssessmentPageProps {
  onComplete: (result: AssessmentRecord) => void;
  onCancel: () => void;
}

export function AssessmentPage({ onComplete, onCancel }: AssessmentPageProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [nextAvailable, setNextAvailable] = useState<string>('');

  useEffect(() => {
    async function checkGate() {
      try {
        const headers = session ? authHeaders(session as any) : { 'Content-Type': 'application/json' };
        const response = await fetch(`${API_BASE}/api/gate`, {
          method: 'GET',
          headers,
        });
        if (response.ok) {
          const data = await response.json();
          if (data.allowed === false) {
            setAllowed(false);
            setDaysRemaining(data.days_remaining ?? 0);
            setNextAvailable(data.next_available ?? new Date().toISOString());
          } else {
            setAllowed(true);
          }
        } else {
          setAllowed(true);
        }
      } catch (error) {
        console.error('Failed to query gate status:', error);
        setAllowed(true);
      } finally {
        setLoading(false);
      }
    }
    checkGate();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center font-body bg-ivory-100">
        <div className="w-8 h-8 border-2 border-t-transparent border-sage-600 rounded-full animate-spin mb-3" />
        <p className="text-xs text-ink-muted select-none">Verifying assessment protocols...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-[90vh] w-full flex flex-col justify-center select-none overflow-hidden bg-ivory-100 font-body py-12 md:py-4"
    >
      {/* Noise Grain Texture Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.04,
        }}
        aria-hidden="true"
      />

      {/* Floating Ambient Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <motion.div
          animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
          className="absolute top-1/4 -left-12 w-64 h-64 md:w-96 md:h-96 rounded-full bg-sage-100/40 blur-3xl"
        />
        <motion.div
          animate={{ y: [0, 15, 0], x: [0, -15, 0] }}
          transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-1/4 -right-12 w-60 h-60 md:w-80 md:h-80 rounded-full bg-amber-100/40 blur-3xl"
        />
      </div>

      {/* Two-column layout */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
        {!allowed ? (
          <div className="flex justify-center">
            <GateCountdown daysRemaining={daysRemaining} nextAvailable={nextAvailable} />
          </div>
        ) : (
          // Fixed-height grid — neither column can grow or shrink the row
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20"
            style={{ gridAutoRows: 'minmax(640px, auto)' }}  // floor of 640px, never shrinks below it
          >
            {/* LEFT COLUMN — locked in place, vertically centered inside the row */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col justify-center gap-8 text-left self-start md:self-center md:sticky md:top-24"
            >
              {/* Badge + Heading */}
              <div className="flex flex-col gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage-600 bg-sage-100 px-3 py-1 rounded-full w-fit border border-sage-200/60">
                  <HeartPulse className="w-3.5 h-3.5" />
                  PHQ-9 Self-Reflection
                </span>
                <h2 className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-ink tracking-tight leading-tight">
                  How have you been feeling?
                </h2>
                <p className="text-sm md:text-base text-ink-soft leading-relaxed max-w-sm">
                  Take a deep breath. Respond honestly — there are no right or wrong answers. This reflection is entirely private.
                </p>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-col gap-3">
                {[
                  { icon: Lock, text: 'Your answers are never stored — only your score and tier are saved' },
                  { icon: ShieldCheck, text: 'Based on the validated PHQ-9 scale' },
                  { icon: Clock, text: 'Takes about 2 minutes to complete' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-sage-100 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-sage-600" />
                    </div>
                    <span className="text-xs text-ink-soft">{text}</span>
                  </div>
                ))}
              </div>

              {/* Subtle quote */}
              <blockquote className="border-l-2 border-sage-400 pl-4 text-sm italic text-ink-muted leading-relaxed max-w-xs">
                "Awareness is the first step toward change."
              </blockquote>
            </motion.div>

            {/* RIGHT COLUMN — shell fills the full row height */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="w-full flex flex-col"  // flex-col so AssessmentShell's h-full works
            >
              <AssessmentShell
                onComplete={onComplete}
                onCancel={onCancel}
              />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default AssessmentPage;