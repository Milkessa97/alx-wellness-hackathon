import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AssessmentRecord } from '../../types';
import AssessmentShell from '../../components/assessment/AssessmentShell';
import { GateCountdown } from '../../components/dashboard/GateCountdown';
import { motion } from 'motion/react';
import { authHeaders } from '../../lib/api';

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
          // If the network request fails or route does not exist, default to allowed for safe recovery
          setAllowed(true);
        }
      } catch (error) {
        console.error('Failed to query gate status:', error);
        setAllowed(true); // Default to allowed on network or connection fail
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
      className="relative min-h-[90vh] flex flex-col justify-center items-center px-6 py-12 md:py-16 select-none overflow-hidden bg-ivory-100 font-body"
    >
      {/* 4% Noise Grain Texture Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.04,
        }}
        aria-hidden="true"
      />

      {/* Floating Background Ambient Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        {/* Large sage blob */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 10,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 -left-12 w-64 h-64 md:w-80 md:h-80 rounded-full bg-sage-100/40 blur-3xl"
        />

        {/* Medium amber blob */}
        <motion.div
          animate={{
            y: [0, 15, 0],
            x: [0, -15, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 12,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-1/4 -right-12 w-60 h-60 md:w-72 md:h-72 rounded-full bg-amber-100/40 blur-3xl"
        />
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center space-y-4">
        {!allowed ? (
          <GateCountdown daysRemaining={daysRemaining} nextAvailable={nextAvailable} />
        ) : (
          <>
            {/* Header Metadata badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center gap-1.5"
            >
              <h2 className="font-display font-bold text-2xl md:text-3xl text-ink tracking-tight">
                Self-Reflective Screener
              </h2>
              <p className="text-xs md:text-sm text-ink-light max-w-md mx-auto leading-relaxed">
                Take a deep breath and respond honestly. Your self-reflection results are encrypted locally and fully private.
              </p>
            </motion.div>

            {/* Dynamic Interactive Core Assessment Engine Container */}
            <AssessmentShell
              onComplete={onComplete}
              onCancel={onCancel}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}

export default AssessmentPage;
