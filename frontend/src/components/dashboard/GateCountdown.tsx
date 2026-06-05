import { format } from 'date-fns';
import Card from '../ui/Card';
import { motion } from 'motion/react';

interface GateCountdownProps {
  daysRemaining: number;
  nextAvailable: string;
}

export function GateCountdown({ daysRemaining, nextAvailable }: GateCountdownProps) {
  // Format nextAvailable date with date-fns
  let nextAvailableFormatted = '';
  try {
    nextAvailableFormatted = format(new Date(nextAvailable), 'MMMM d, yyyy');
  } catch (error) {
    console.error('Failed to format date in GateCountdown:', error, nextAvailable);
    nextAvailableFormatted = nextAvailable;
  }

  const handleDashboardNavigate = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new Event('navigationchange'));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[40vh] py-6 select-none font-body">
      <Card
        id="gate-countdown-card"
        variant="default"
        className="w-full max-w-md text-center p-8 md:p-10 flex flex-col items-center justify-center animate-bloom border border-ivory-300 shadow-warm-md rounded-2xl bg-white"
      >
        {/* Large days remaining display */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="font-display font-bold text-[64px] leading-none text-sage-600 drop-shadow-sm select-none"
        >
          {daysRemaining}
        </motion.div>

        {/* Label below the number */}
        <p className="mt-3 text-sm font-semibold text-ink-soft select-none tracking-tight">
          days until your next check-in
        </p>

        {/* Subtext with the formatted date */}
        <p className="mt-2 text-xs text-ink-muted select-none">
          Next available: {nextAvailableFormatted}
        </p>

        {/* Divider and tranquil message encouraging mindfulness */}
        <div className="w-12 h-[1px] bg-ivory-300 my-6" />

        <div className="space-y-4">
          <p className="text-xs text-ink-light leading-relaxed max-w-sm mx-auto">
            Take this time to rest, journal, or practice breathing. Restoring your internal focus aids reliable wellness reporting.
          </p>

          {/* Core Link/Button directing user to /dashboard */}
          <div>
            <button
              id="gate-countdown-dashboard-link"
              onClick={handleDashboardNavigate}
              className="text-xs font-bold text-sage-600 hover:text-sage-700 underline focus:outline-none focus:ring-2 focus:ring-sage-500 rounded px-1.5 py-1 transition-colors cursor-pointer"
            >
              Your last reflection is in your dashboard
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default GateCountdown;
