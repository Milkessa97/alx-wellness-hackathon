import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { GateCountdown } from '../../components/dashboard/GateCountdown';
import { TrendCard } from '../../components/dashboard/TrendCard';
import { ReferralStatus } from '../../components/referral/ReferralStatus';
import { ScoreHistoryChart } from '../../components/analytics/ScoreHistoryChart';
import { TierDistributionChart } from '../../components/analytics/TierDistributionChart';
import { UserMenu } from '../../components/auth/UserMenu';
import { PremiumGate } from '../../components/ui/PremiumGate';
import MoodCalendar from '../../components/premium/MoodCalendar';
import ActionPlanCard from '../../components/premium/ActionPlanCard';
import { Sparkles, X, HeartPulse, Clock, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardPageProps {
  onStartAssessment?: () => void;
}

export function DashboardPage({ onStartAssessment }: DashboardPageProps) {
  const { data: session, status } = useSession();

  const [referralId, setReferralId] = useState<string | null>(null);
  const [upsellDismissed, setUpsellDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem('maedot_upsell_dismissed') === 'true'; }
    catch { return false; }
  });

  const userTier = (session?.user as any)?.tier || (() => {
    try { return localStorage.getItem('maedot_user_tier') || 'free'; }
    catch { return 'free'; }
  })();

  const dismissUpsell = () => {
    setUpsellDismissed(true);
    try { localStorage.setItem('maedot_upsell_dismissed', 'true'); } catch { }
  };

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('navigationchange'));
  };

  const [gateLoading, setGateLoading] = useState(true);
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateData, setGateData] = useState<{
    allowed: boolean; daysRemaining: number; nextAvailable: string;
  } | null>(null);

  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<{
    assessments: any[];
    trend: { trend: string; delta: number | null; message: string };
    encouragement?: string;
  } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') navigateTo('/?signin=true');
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
    const token = (session as any)?.token;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const fetchGate = async () => {
      try {
        setGateLoading(true);
        const res = await fetch(`${API_BASE}/api/gate`, { headers });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setGateData({
          allowed: data.allowed ?? true,
          daysRemaining: data.days_remaining ?? 0,
          nextAvailable: data.next_available ?? new Date().toISOString(),
        });
        setGateError(null);
      } catch {
        setGateError('Unable to load gate status.');
      } finally {
        setGateLoading(false);
      }
    };

    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const res = await fetch(`${API_BASE}/api/history`, { headers });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setHistoryData(data);
        setHistoryError(null);
      } catch {
        setHistoryError('Unable to load your data. Try refreshing.');
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchGate();
    fetchHistory();
  }, [session, status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    const localRefId = localStorage.getItem('maedot_referral_id');
    if (!localRefId) return;
    setReferralId(localRefId);

    const check = async () => {
      try {
        const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
        const token = (session as any)?.token;
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE}/api/referral/status/${localRefId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'confirmed') {
            setTimeout(() => localStorage.removeItem('maedot_referral_id'), 1000);
          }
        }
      } catch { }
    };
    check();
  }, [session, status]);

  const handleStartCheckIn = () => {
    if (onStartAssessment) onStartAssessment();
    else navigateTo('/assessment');
  };

  const getTrendArrow = (item: any) => {
    const sorted = [...(historyData?.assessments || [])].sort(
      (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
    );
    const idx = sorted.findIndex(x => x.id === item.id);
    if (idx <= 0) return null;
    const prev = sorted[idx - 1];
    if (item.score < prev.score) return { arrow: '↓', label: 'Improving', color: 'text-sage-600 bg-sage-50 border border-sage-200/50' };
    if (item.score > prev.score) return { arrow: '↑', label: 'Increasing', color: 'text-amber-600 bg-amber-50 border border-amber-200/50' };
    return { arrow: '→', label: 'Stable', color: 'text-ink-light bg-ivory-50 border border-ivory-200/50' };
  };

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center font-body select-none">
        <div className="w-8 h-8 border-2 border-t-transparent border-sage-600 rounded-full animate-spin mb-3" />
        <p className="text-xs text-ink-muted font-mono">Authenticating...</p>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session) return null;

  const firstName = session.user?.name?.split(' ')[0] || 'there';
  const assessments = historyData?.assessments || [];
  const recentThree = [...assessments].slice(-3).reverse();

  return (
    <div className="w-full font-body pb-16">
      <style>{`
        @keyframes customPulse { 0%,100%{opacity:.45} 50%{opacity:1} }
        .animate-pulse-custom { animation: customPulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* ── GREETING HEADER (full width) ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-ivory-200"
      >
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-sage-600 uppercase tracking-widest font-mono">
            Patient Portal Home
          </span>
          <h1 className="font-display font-medium text-3xl md:text-4xl text-ink leading-tight">
            Welcome back, {firstName}.
          </h1>
          <p className="text-xs text-ink-muted">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            })}
          </p>
        </div>
        <div className="shrink-0 self-start sm:self-auto z-20">
          <UserMenu />
        </div>
      </motion.div>

      {/* ── TWO-COLUMN GRID: Left (gate/trend/referral) + Right (recent check-ins) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">

        {/* LEFT COLUMN */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-6"
        >
          {/* Gate card */}
          {gateLoading ? (
            <div className="animate-pulse-custom bg-ivory-50/70 border border-ivory-200 rounded-3xl h-28 p-6 space-y-2">
              <div className="h-4 w-1/4 bg-ivory-200/80 rounded" />
              <div className="h-3 w-1/2 bg-ivory-200/50 rounded" />
            </div>
          ) : gateError ? (
            <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-4 text-center">
              <p className="text-xs font-medium text-rose-700">{gateError}</p>
            </div>
          ) : gateData?.allowed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-sage-100 border border-sage-200/60 rounded-3xl p-6 flex flex-col gap-4 shadow-warm-xs"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-semibold text-sage-700 uppercase tracking-widest font-mono">
                  Current Status
                </span>
                <h3 className="font-display font-bold text-xl text-sage-800 leading-snug">
                  Your check-in is available
                </h3>
                <p className="text-xs text-sage-600 leading-relaxed">
                  Private, confidential, and takes around 2 minutes.
                </p>
              </div>
              <button
                onClick={handleStartCheckIn}
                className="self-start bg-sage-600 hover:bg-sage-700 text-white font-bold text-xs py-3 px-5 rounded-2xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <HeartPulse className="w-3.5 h-3.5" />
                Begin Check-in →
              </button>
            </motion.div>
          ) : (
            <GateCountdown
              daysRemaining={gateData?.daysRemaining ?? 0}
              nextAvailable={gateData?.nextAvailable ?? new Date().toISOString()}
            />
          )}

          {/* Trend + encouragement */}
          {historyLoading ? (
            <div className="animate-pulse-custom bg-ivory-50/70 border border-ivory-200 rounded-3xl h-36 p-6 space-y-3">
              <div className="h-4 w-1/3 bg-ivory-200/80 rounded" />
              <div className="h-3 w-5/6 bg-ivory-200/50 rounded" />
              <div className="h-3 w-2/3 bg-ivory-200/30 rounded" />
            </div>
          ) : historyData?.trend && historyData.trend.trend !== 'insufficient_data' ? (
            <div className="space-y-3">
              <TrendCard trend={historyData.trend} />
              {historyData.encouragement && (
                <p className="text-xs text-ink-muted italic leading-relaxed pl-1">
                  "{historyData.encouragement}"
                </p>
              )}
            </div>
          ) : null}

          {/* Referral status */}
          {referralId && <ReferralStatus referralId={referralId} />}

          {/* Premium upsell banner */}
          <AnimatePresence>
            {userTier !== 'premium' && !upsellDismissed && assessments.length > 3 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-amber-100 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <button
                  onClick={() => navigateTo('/pricing')}
                  className="flex items-center gap-2 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer text-left"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  Unlock your full history and trend charts with Premium →
                </button>
                <button onClick={dismissUpsell} className="shrink-0 text-amber-600 hover:text-amber-800 p-1 rounded-lg cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* RIGHT COLUMN — recent check-ins only */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          className="flex flex-col gap-6"
        >
          {historyLoading ? (
            <div className="animate-pulse-custom bg-ivory-50/70 border border-ivory-200 rounded-3xl h-44 p-6 space-y-3">
              <div className="h-4 w-1/4 bg-ivory-200/80 rounded" />
              <div className="h-3.5 w-full bg-ivory-200/40 rounded" />
              <div className="h-3.5 w-full bg-ivory-200/20 rounded" />
            </div>
          ) : historyError ? (
            <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-5 text-center">
              <p className="text-xs font-semibold text-rose-700">{historyError}</p>
            </div>
          ) : historyData ? (
            <div className="bg-white border border-ivory-200 rounded-3xl p-6 shadow-warm-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-medium text-lg text-ink-soft">
                  Recent check-ins
                </h3>
                <Clock className="w-4 h-4 text-ink-light" />
              </div>

              {recentThree.length > 0 ? (
                <div className="space-y-3">
                  {recentThree.map((item: any) => {
                    const trend = getTrendArrow(item);
                    const dateStr = new Date(item.taken_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    });
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 border border-ivory-100/60 hover:border-ivory-200 rounded-2xl bg-ivory-50/35 hover:bg-ivory-50/60 transition-all"
                      >
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-ink-muted uppercase tracking-wide font-mono">
                            {dateStr}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-ink-soft">
                              Score: <span className="font-mono text-sm">{item.score}</span>
                              <span className="text-[10px] font-normal text-ink-muted"> /27</span>
                            </p>
                            {item.tier === 'elevated' ? (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-mono text-[9px] font-bold rounded-full border border-amber-200 uppercase tracking-wider leading-none">
                                Moderate
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-sage-50 text-sage-600 font-mono text-[9px] font-bold rounded-full border border-sage-200 uppercase tracking-wider leading-none">
                                Mild
                              </span>
                            )}
                          </div>
                        </div>
                        {trend && (
                          <div className={`p-2 rounded-xl flex items-center justify-center font-bold text-xs ${trend.color}`} title={trend.label}>
                            <span className="font-mono text-sm leading-none">{trend.arrow}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-ivory-300 rounded-2xl p-6 text-center flex flex-col items-center gap-2">
                  <p className="text-xs font-bold text-ink-muted">No check-ins recorded yet</p>
                  <p className="text-[11px] text-ink-muted leading-relaxed max-w-xs">
                    Complete your first check-in to start tracking your progress.
                  </p>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-ivory-100/60 text-right">
                <button
                  onClick={() => navigateTo('/history')}
                  className="text-xs font-bold font-mono text-sage-600 hover:text-sage-700 hover:underline transition-colors cursor-pointer"
                >
                  View full history →
                </button>
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>

      {/* ── ANALYTICS ROW — full width below both columns, 2-col grid ── */}
      {historyLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
          <div className="animate-pulse-custom bg-ivory-50/70 border border-ivory-200 rounded-3xl h-[300px] w-full" />
          <div className="animate-pulse-custom bg-ivory-50/70 border border-ivory-200 rounded-3xl h-[300px] w-full" />
        </div>
      ) : !historyError && assessments.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10"
        >
          <PremiumGate featureName="Full trend analytics">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-1">
                <TrendingUp className="w-4 h-4 text-ink-light" />
                <span className="font-display font-medium text-lg text-ink-soft">Analytics</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <ScoreHistoryChart history={assessments} />
                <TierDistributionChart history={assessments} />
              </div>
            </div>
          </PremiumGate>
        </motion.div>
      ) : null}

      {/* ── Premium Insights (premium tier only) ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-10"
      >
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#4A6B4C]">✦ Premium Insights</h2>
          <span className="rounded-full bg-amber-100 px-2 text-xs text-amber-700">
            Premium
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PremiumGate featureName="Mood Calendar">
            <MoodCalendar />
          </PremiumGate>
          <PremiumGate featureName="Daily Action Plan">
            <ActionPlanCard />
          </PremiumGate>
        </div>
      </motion.div>
    </div>
  );
}

export default DashboardPage;