import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { GateCountdown } from '../../components/dashboard/GateCountdown';
import { TrendCard } from '../../components/dashboard/TrendCard';
import { ReferralStatus } from '../../components/referral/ReferralStatus';
import { ScoreHistoryChart } from '../../components/analytics/ScoreHistoryChart';
import { TierDistributionChart } from '../../components/analytics/TierDistributionChart';
import { UserMenu } from '../../components/auth/UserMenu';
import { PremiumGate } from '../../components/ui/PremiumGate';
import { ChevronRight, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardPageProps {
  onStartAssessment?: () => void;
}

export function DashboardPage({ onStartAssessment }: DashboardPageProps) {
  const { data: session, status } = useSession();

  // Route syncing and active referral tracking
  const [referralId, setReferralId] = useState<string | null>(null);

  // Dismissable Premium upsell banner (free users with enough history)
  const [upsellDismissed, setUpsellDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('maedot_upsell_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const userTier = (session?.user as any)?.tier || (() => {
    try {
      return localStorage.getItem('maedot_user_tier') || 'free';
    } catch {
      return 'free';
    }
  })();
  const dismissUpsell = () => {
    setUpsellDismissed(true);
    try {
      localStorage.setItem('maedot_upsell_dismissed', 'true');
    } catch {
      /* ignore */
    }
  };
  const navigateToPricing = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/pricing');
      window.dispatchEvent(new Event('navigationchange'));
    }
  };

  // Separate loading, error, and data states for decoupling section rendering
  const [gateLoading, setGateLoading] = useState(true);
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateData, setGateData] = useState<{ allowed: boolean; daysRemaining: number; nextAvailable: string } | null>(null);

  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<{
    assessments: any[];
    trend: { trend: string; delta: number | null; message: string };
    encouragement?: string;
  } | null>(null);

  // Authentication redirection guard
  useEffect(() => {
    if (status === 'unauthenticated') {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/?signin=true');
        window.dispatchEvent(new Event('navigationchange'));
      }
    }
  }, [status]);

  // Initial fetch operations for Gate status and History/Trend details
  useEffect(() => {
    if (status !== 'authenticated') return;

    const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
    const token = (session as any)?.token;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Fetch Gate Status
    const fetchGate = async () => {
      try {
        setGateLoading(true);
        const response = await fetch(`${API_BASE}/api/gate`, { headers });
        if (!response.ok) {
          throw new Error('Failed to retrieve wait gate limit Status.');
        }
        const data = await response.json();
        setGateData({
          allowed: data.allowed ?? true,
          daysRemaining: data.days_remaining ?? 0,
          nextAvailable: data.next_available ?? new Date().toISOString()
        });
        setGateError(null);
      } catch (err: any) {
        console.error('Error in Dashboard fetching gate status:', err);
        setGateError('Unable to load wait window status.');
      } finally {
        setGateLoading(false);
      }
    };

    // Fetch History & Trend Details
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const response = await fetch(`${API_BASE}/api/history`, { headers });
        if (!response.ok) {
          throw new Error('Failed to retrieve diagnostic assessment history.');
        }
        const data = await response.json();
        setHistoryData(data);
        setHistoryError(null);
      } catch (err: any) {
        console.error('Error in Dashboard fetching history data:', err);
        setHistoryError('Unable to load your data. Try refreshing.');
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchGate();
    fetchHistory();
  }, [session, status]);

  // Referral monitoring, verification, and once-confirmed cleaning routine
  useEffect(() => {
    if (status !== 'authenticated') return;

    const localRefId = localStorage.getItem('maedot_referral_id');
    if (localRefId) {
      setReferralId(localRefId);
      
      const checkAndCleanReferralId = async () => {
        try {
          const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
          const token = (session as any)?.token;
          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`${API_BASE}/api/referral/status/${localRefId}`, { headers });
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'confirmed') {
              // Wait 1 second matching smooth rendering layout, then remove local key
              setTimeout(() => {
                localStorage.removeItem('maedot_referral_id');
              }, 1000);
            }
          }
        } catch (err) {
          console.error('Error evaluating referral status check-off loop:', err);
        }
      };

      checkAndCleanReferralId();
    }
  }, [session, status]);

  const handleStartCheckIn = () => {
    if (onStartAssessment) {
      onStartAssessment();
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/assessment');
      window.dispatchEvent(new Event('navigationchange'));
    }
  };

  const handleNavigateHistory = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/history');
      window.dispatchEvent(new Event('navigationchange'));
    }
  };

  // Helper formatting for chronological score trends
  const getTrendArrow = (item: any) => {
    const assessments = historyData?.assessments || [];
    const chronological = [...assessments].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime());
    const idx = chronological.findIndex(x => x.id === item.id);
    if (idx <= 0) return null;
    const prev = chronological[idx - 1];
    
    if (item.score < prev.score) {
      return {
        arrow: '↓',
        label: 'Improving',
        color: 'text-sage-600 bg-sage-50 border border-sage-200/50'
      };
    } else if (item.score > prev.score) {
      return {
        arrow: '↑',
        label: 'Increasing',
        color: 'text-amber-600 bg-amber-50 border border-amber-200/50'
      };
    } else {
      return {
        arrow: '→',
        label: 'Stable',
        color: 'text-ink-light bg-ivory-50 border border-ivory-200/50'
      };
    }
  };

  // Safe global authenticating loading render state
  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center font-body select-none">
        <div className="w-8 h-8 border-2 border-t-transparent border-sage-600 rounded-full animate-spin mb-3" />
        <p className="text-xs text-ink-muted font-mono">Authenticating patient credentials...</p>
      </div>
    );
  }

  // Safe blocker to avoid leakage while redirect processes unauthenticated states
  if (status === 'unauthenticated' || !session) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-body text-left pb-12">
      {/* Dynamic inline styles for smooth customized skeleton pulse animations */}
      <style>{`
        @keyframes customPulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        .animate-pulse-custom {
          animation: customPulse 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* SECTION 1: Greeting Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-ivory-200 select-none">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-sage-605 text-sage-600 uppercase tracking-widest font-mono">
            Patient Portal Home
          </span>
          <h1 className="font-display font-medium text-3xl text-ink leading-tight">
            Welcome back, {session.user?.name?.split(' ')[0] || 'User'}.
          </h1>
          <p className="text-xs text-ink-muted">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>

        <div className="shrink-0 self-start sm:self-auto z-20">
          <UserMenu />
        </div>
      </div>

      {/* SECTION 2: Gate Status Card */}
      <div className="w-full">
        {gateLoading ? (
          <div className="animate-pulse-custom bg-ivory-50/70 border border-ivory-200 rounded-3xl h-28 w-full flex flex-col justify-center p-6 space-y-2 select-none">
            <div className="h-4.5 w-1/4 bg-ivory-200/80 rounded" />
            <div className="h-3 w-1/2 bg-ivory-200/50 rounded" />
          </div>
        ) : gateError ? (
          <div className="bg-rose-50/50 border border-rose-250 rounded-2xl p-4 text-center select-none">
            <p className="text-xs font-medium text-rose-700 leading-normal font-sans">
              {gateError}
            </p>
          </div>
        ) : gateData?.allowed ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-sage-100 border border-sage-200/60 rounded-3xl p-6 text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-warm-xs"
          >
            <div className="space-y-1 select-none">
              <span className="text-[9px] font-semibold text-sage-700 uppercase tracking-widest font-mono">
                Current Status
              </span>
              <h3 className="font-display font-bold text-xl text-sage-800 leading-snug">
                Your check-in is available
              </h3>
              <p className="text-xs text-sage-600 leading-relaxed max-w-sm">
                You may take your next clinical wellness session now. It is private, confidential, and takes around 120 seconds.
              </p>
            </div>

            <button
              onClick={handleStartCheckIn}
              className="shrink-0 bg-sage-600 hover:bg-sage-700 text-white font-bold text-xs py-3 px-5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer select-none leading-none mt-2 sm:mt-0"
            >
              <span>Begin Check-in &rarr;</span>
            </button>
          </motion.div>
        ) : (
          <GateCountdown
            daysRemaining={gateData?.daysRemaining ?? 0}
            nextAvailable={gateData?.nextAvailable ?? new Date().toISOString()}
          />
        )}
      </div>

      {/* SECTION 3: Trend Summary Block */}
      <div className="w-full">
        {historyLoading ? (
          <div className="animate-pulse-custom bg-ivory-50/70 border border-ivory-200 rounded-3xl h-36 w-full flex flex-col justify-center p-6 space-y-3.5 select-none">
            <div className="h-4.5 w-1/3 bg-ivory-200/80 rounded" />
            <div className="h-3 w-5/6 bg-ivory-200/50 rounded" />
            <div className="h-3 w-2/3 bg-ivory-200/30 rounded" />
          </div>
        ) : historyError ? (
          <div className="bg-rose-50/50 border border-rose-250 rounded-2xl p-5 text-center select-none shadow-warm-xs">
            <p className="text-xs font-semibold text-rose-700 leading-normal font-sans">
              Unable to load your data. Try refreshing.
            </p>
          </div>
        ) : historyData && historyData.trend && historyData.trend.trend !== 'insufficient_data' ? (
          <div className="space-y-3.5">
            <TrendCard trend={historyData.trend} />
            {historyData.encouragement && (
              <p className="text-xs font-body text-ink-muted italic leading-relaxed pl-1">
                "{historyData.encouragement}"
              </p>
            )}
          </div>
        ) : null}
      </div>

      {/* SECTION 4: Referral Status Block */}
      {referralId && (
        <div className="w-full">
          <ReferralStatus referralId={referralId} />
        </div>
      )}

      {/* SECTION 5: Recent Check-ins */}
      <div className="w-full">
        {historyLoading ? (
          <div className="animate-pulse-custom bg-ivory-50/70 border border-ivory-200 rounded-3xl h-44 w-full flex flex-col justify-center p-6 space-y-3 select-none">
            <div className="h-4.5 w-1/4 bg-ivory-200/80 rounded" />
            <div className="h-3.5 w-full bg-ivory-200/40 rounded" />
            <div className="h-3.5 w-full bg-ivory-200/20 rounded" />
          </div>
        ) : !historyError && historyData ? (
          <div className="bg-white border border-ivory-200 rounded-3xl p-6 shadow-warm-xs text-left">
            <h3 className="font-display font-medium text-lg text-ink-soft mb-4 select-none">
              Recent check-ins
            </h3>

            {historyData.assessments && historyData.assessments.length > 0 ? (
              <div className="space-y-3">
                {([...historyData.assessments].slice(-3).reverse()).map((item: any) => {
                  const trend = getTrendArrow(item);
                  const dateStr = new Date(item.taken_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 border border-ivory-100/60 hover:border-ivory-200 rounded-2xl bg-ivory-50/35 hover:bg-ivory-50/50 transition-all"
                    >
                      <div className="text-left space-y-1 font-sans">
                        <p className="text-[10px] font-bold text-ink-muted leading-none uppercase tracking-wide font-mono">
                          {dateStr}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-ink-soft">
                            Score: <span className="font-mono text-sm">{item.score}</span> <span className="text-[10px] font-normal text-ink-muted">/27</span>
                          </p>
                          {item.tier === 'elevated' ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-mono text-[9px] font-bold rounded-full border border-amber-200 uppercase tracking-wider select-none leading-none">
                              Moderate
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-sage-50 text-sage-600 font-mono text-[9px] font-bold rounded-full border border-sage-200 uppercase tracking-wider select-none leading-none">
                              Mild
                            </span>
                          )}
                        </div>
                      </div>

                      {trend && (
                        <div
                          className={`p-2 rounded-xl flex items-center justify-center font-bold text-xs select-none ${trend.color}`}
                          title={`Trend vs previous: ${trend.label}`}
                        >
                          <span className="font-mono text-sm leading-none">{trend.arrow}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-ivory-300 rounded-2xl p-6.5 text-center flex flex-col items-center justify-center gap-2 select-none">
                <p className="text-xs font-bold text-ink-muted font-sans">No recent check-ins recorded yet</p>
                <p className="text-[11px] text-ink-muted font-body leading-relaxed max-w-sm">
                  Complete your first check-in to start tracking clinical progress, timeline diagrams, and diagnostic thresholds.
                </p>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-ivory-100/60 text-right">
              <button
                onClick={handleNavigateHistory}
                className="text-xs font-bold font-mono text-sage-600 hover:text-sage-700 hover:underline transition-colors focus:outline-none cursor-pointer"
              >
                View full history &rarr;
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Premium upsell banner — free users with more than 3 check-ins */}
      <AnimatePresence>
        {userTier !== 'premium' &&
          !upsellDismissed &&
          historyData &&
          (historyData.assessments?.length ?? 0) > 3 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              className="bg-amber-100 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <button
                onClick={navigateToPricing}
                className="flex items-center gap-2 text-left text-xs md:text-sm font-semibold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Unlock your full history and trend charts with Premium &rarr;</span>
              </button>
              <button
                onClick={dismissUpsell}
                aria-label="Dismiss"
                className="shrink-0 text-amber-600 hover:text-amber-800 p-1 rounded-lg hover:bg-amber-200/50 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
      </AnimatePresence>

      {/* SECTION 6: Analytics Charts (Stacked on mobile, side-by-side on desktop) */}
      <div className="w-full">
        {historyLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
            <div className="animate-pulse-custom bg-ivory-50/70 border border-ivory-200 rounded-3xl h-[280px] w-full" />
            <div className="animate-pulse-custom bg-ivory-50/70 border border-ivory-200 rounded-3xl h-[280px] w-full" />
          </div>
        ) : !historyError && historyData && historyData.assessments && historyData.assessments.length > 0 ? (
          <PremiumGate featureName="Full trend analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div className="w-full flex">
                <ScoreHistoryChart history={historyData.assessments} />
              </div>
              <div className="w-full flex">
                <TierDistributionChart history={historyData.assessments} />
              </div>
            </div>
          </PremiumGate>
        ) : null}
      </div>
    </div>
  );
}

export default DashboardPage;
