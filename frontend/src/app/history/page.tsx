import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { clearAnalytics } from '../../lib/analytics';
import {
  ArrowLeft,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
  Trash
} from 'lucide-react';
import { motion } from 'motion/react';
import { PremiumGate } from '../../components/ui/PremiumGate';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/toast';

interface AssessmentRecord {
  id: string;
  taken_at: string;
  score: number;
  tier: 'safe' | 'elevated' | 'crisis';
  answers?: number[];
  notes?: string;
}

export function HistoryPage() {
  const { data: session, status } = useSession();
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Free users see only their 3 most recent check-ins; the rest are gated.
  const isPremium = (session?.user as any)?.tier === 'premium' || (() => {
    try {
      return localStorage.getItem('maedot_user_tier') === 'premium';
    } catch {
      return false;
    }
  })();

  // Redirect to '/' if unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new Event('navigationchange'));
      }
    }
  }, [status]);

  // Fetch History on Mount
  const fetchHistory = async () => {
    if (status !== 'authenticated') return;
    try {
      setLoading(true);
      const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
      const token = (session as any)?.token;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/api/history`, { headers });
      if (!response.ok) {
        throw new Error('Unable to load your data. Try refreshing.');
      }
      const data = await response.json();
      
      // Ensure we extract assessments array safely
      const assessmentsList = data.assessments || [];
      // Sort newest first
      const sorted = [...assessmentsList].sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
      
      setAssessments(sorted);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching history:', err);
      setError('Unable to load your data. Try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [session, status]);

  const handleNavigateDashboard = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new Event('navigationchange'));
    }
  };

  const handleTakeCheckIn = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/assessment');
      window.dispatchEvent(new Event('navigationchange'));
    }
  };

  // Perform full irreversible deletion of history
  const handleDeleteHistory = async () => {
    try {
      setIsDeleting(true);
      const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
      const token = (session as any)?.token;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/api/history`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        throw new Error('Unable to delete your check-in history. Please retry.');
      }

      // Success
      setAssessments([]);
      
      // Clear local analytical backups and active referral slots concurrently to avoid page mismatches
      clearAnalytics();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('reflect_analytics_data');
        localStorage.removeItem('maedot_referral_id');
        localStorage.removeItem('reflect_active_referral');
      }

      toast({
        type: 'success',
        title: 'History cleared',
        message: 'Your check-in history has been permanently deleted.',
      });
      setShowDeleteModal(false);
    } catch (err: any) {
      toast({
        type: 'error',
        title: "That didn't work",
        message: err.message || 'Something went wrong while clearing your history. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Date formatted: "Monday, June 3 2026"
  const formatCheckInDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };
      
      // Format as "Monday, June 3, 2026", then strip the comma after the day to get exactly "Monday, June 3 2026"
      const formatted = d.toLocaleDateString('en-US', options);
      // Remove comma after day number
      return formatted.replace(/(\d+),/, '$1');
    } catch {
      return dateStr;
    }
  };

  // Identify directional change relative to the preceding clinical timeline record
  const getTrendArrow = (item: AssessmentRecord, allItems: AssessmentRecord[]) => {
    // Sort oldest to newest to find chronological previous check-in
    const chronological = [...allItems].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime());
    const idx = chronological.findIndex(x => x.id === item.id);
    if (idx <= 0) return null; // No previous history item to compare to
    
    const prev = chronological[idx - 1];
    
    if (item.score < prev.score) {
      return {
        icon: <TrendingDown className="w-3.5 h-3.5" />,
        char: '↓',
        label: 'improving',
        color: 'text-sage-600 bg-sage-50 border border-sage-200/50'
      };
    } else if (item.score > prev.score) {
      return {
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        char: '↑',
        label: 'declining',
        color: 'text-rose-600 bg-rose-50 border border-rose-200/50'
      };
    } else {
      return {
        icon: <Minus className="w-3.5 h-3.5" />,
        char: '→',
        label: 'stable',
        color: 'text-ink-muted bg-ivory-50 border border-ivory-200/50'
      };
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center font-body select-none">
        <div className="w-8 h-8 border-2 border-t-transparent border-sage-600 rounded-full animate-spin mb-3" />
        <p className="text-xs text-ink-muted">Getting your check-ins…</p>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-body text-left pb-16 relative">
      <style>{`
        @keyframes customPulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        .animate-pulse-custom {
          animation: customPulse 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* Header and back control */}
      <div className="select-none flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <button
            onClick={handleNavigateDashboard}
            className="text-xs font-bold text-sage-600 hover:text-sage-700 font-mono tracking-wide uppercase flex items-center gap-1.5 focus:outline-none cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h1 className="font-display font-medium text-3xl text-ink leading-tight">
            Your Check-in History
          </h1>
          <p className="text-xs text-ink-muted">
            All data is stored privately and only visible to you.
          </p>
        </div>
        <button
          onClick={handleTakeCheckIn}
          className="shrink-0 bg-sage-600 hover:bg-sage-700 text-white font-bold text-xs py-2.5 px-4.5 rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-1 self-start sm:self-auto leading-none"
        >
          <span>New Check-in &rarr;</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="w-full">
        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse-custom bg-ivory-50/75 border border-ivory-200 rounded-2xl h-16 w-full" />
            <div className="animate-pulse-custom bg-ivory-50/75 border border-ivory-200 rounded-2xl h-16 w-full" />
            <div className="animate-pulse-custom bg-ivory-50/75 border border-ivory-200 rounded-2xl h-16 w-full" />
          </div>
        ) : error ? (
          <div className="bg-rose-50/50 border border-rose-250 rounded-2xl p-5 text-center select-none shadow-warm-xs">
            <p className="text-xs font-semibold text-rose-750 text-rose-700 leading-normal font-sans">
              {error}
            </p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="bg-white border border-dashed border-ivory-300 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-warm-xs select-none">
            <div className="p-4 bg-ivory-50 rounded-full border border-ivory-200 max-w-max mx-auto text-ink-light">
              <Minus className="w-6 h-6 text-ink-muted" strokeWidth={2.5} />
            </div>
            <h3 className="font-display font-bold text-lg text-ink-soft">
              No check-ins yet.
            </h3>
            <p className="text-xs text-ink-light leading-relaxed max-w-sm mx-auto font-body">
              Complete your initial diagnostics to log scores, evaluate trends, and monitor clinical checkpoints securely.
            </p>
            <div className="pt-3">
              <button
                onClick={handleTakeCheckIn}
                className="bg-sage-600 hover:bg-sage-700 text-white font-bold text-xs py-3 px-6 rounded-2xl transition-all shadow-md cursor-pointer inline-flex items-center gap-1"
              >
                <span>Take your first check-in &rarr;</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
          <div className="bg-white border border-ivory-200 rounded-3xl overflow-hidden shadow-warm-xs p-1 sm:p-2">
            <div className="divide-y divide-ivory-100">
              {(isPremium ? assessments : assessments.slice(0, 3)).map((item, idx) => {
                const trend = getTrendArrow(item, assessments);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -2 }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 gap-4 hover:bg-ivory-50/25 transition-colors rounded-2xl"
                  >
                    {/* Left: Date */}
                    <div className="text-left font-sans">
                      <p className="text-xs font-bold text-ink-soft">
                        {formatCheckInDate(item.taken_at)}
                      </p>
                    </div>

                    {/* Right: Score, Tier Badge, Trend Arrow */}
                    <div className="flex items-center gap-3 sm:self-center">
                      <div className="font-mono text-sm font-bold text-ink-soft flex items-baseline gap-0.5">
                        <span className="text-base text-ink font-black">{item.score}</span>
                        <span className="text-[10px] text-ink-muted">/27</span>
                      </div>

                      {/* Tier Badge */}
                      {item.tier === 'elevated' || item.tier === 'crisis' ? (
                        <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 font-mono text-[9px] font-bold rounded-full border border-amber-200 uppercase tracking-wider select-none leading-none">
                          Elevated
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-sage-50 text-sage-600 font-mono text-[9px] font-bold rounded-full border border-sage-200 uppercase tracking-wider select-none leading-none">
                          Safe
                        </span>
                      )}

                      {/* Trend indicator */}
                      {trend ? (
                        <div 
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs select-none shadow-warm-xs ${trend.color}`}
                          title={`vs preceding check-in score: ${trend.label}`}
                          id={`trend-arrow-${item.id}`}
                        >
                          <span className="font-mono text-xs leading-none">{trend.char}</span>
                        </div>
                      ) : (
                        <div className="w-7 h-7 bg-ivory-50 border border-ivory-150/50 rounded-lg flex items-center justify-center text-ink-muted font-mono text-xs select-none">
                          -
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Remaining check-ins are gated for free users */}
          {!isPremium && assessments.length > 3 && (
            <PremiumGate featureName="Full assessment history" compact={false}>
              {/* remaining assessments hidden */}
            </PremiumGate>
          )}
          </div>
        )}
      </div>

      {/* DANGER ZONE AT BOTTOM */}
      <div className="border-t border-ivory-200 pt-8 mt-12 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-rose-600 uppercase tracking-wider font-mono">
            Delete My Data
          </h2>
          <p className="text-xs text-ink-muted mt-1 leading-relaxed max-w-sm">
            This permanently deletes all your check-in history. Your account remains active.
          </p>
        </div>

        <div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 px-4 py-2.5 rounded-xl transition-all cursor-pointer focus:outline-none select-none duration-150 leading-none"
            id="delete-history-trigger"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete History
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteHistory}
        loading={isDeleting}
        tone="danger"
        icon={<Trash className="w-6 h-6" />}
        title="Delete your history? This can't be undone."
        description="This will permanently remove all of your saved check-ins, milestones, and trends. Your account stays active."
        confirmLabel="Yes, delete everything"
        cancelLabel="Cancel"
      />
    </div>
  );
}

export default HistoryPage;
