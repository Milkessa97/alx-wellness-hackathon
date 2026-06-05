import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  CalendarDays, 
  Clock, 
  ShieldCheck, 
  HelpCircle, 
  AlertCircle, 
  Trash2,
  Building 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReferralStatusProps {
  referralId?: string;
  onRefreshTrigger?: number;
  className?: string;
}

interface ReferralAPIResponse {
  id: string;
  clinic_name: string;
  status: 'pending' | 'confirmed' | 'declined' | 'reassigned';
  confirmed_at?: string;
}

export function ReferralStatus({ referralId, onRefreshTrigger = 0, className = '' }: ReferralStatusProps) {
  const { data: session } = useSession();
  const [booking, setBooking] = useState<any>(null);
  
  // API State
  const [apiData, setApiData] = useState<ReferralAPIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper routine to fetch dynamic status
  const fetchStatus = async (id: string) => {
    try {
      const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
      const token = (session as any)?.token;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/api/referral/status/${id}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve active referral status');
      }

      const resJson: ReferralAPIResponse = await response.json();
      setApiData(resJson);
      setError(null);

      // Stop polling when confirmed or declined
      if (resJson.status === 'confirmed' || resJson.status === 'declined') {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      }
    } catch (err: any) {
      console.error('Error fetching referral status:', err);
      // Fails silently if we already have some data to display, else exposes the issue
      if (!apiData) {
        setError(err.message || 'Unable to retrieve status.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Lifecycle monitoring
  useEffect(() => {
    let activeId = referralId;

    // Load from localStorage local copy if no explicit prop is given
    if (!activeId && typeof window !== 'undefined') {
      const localData = localStorage.getItem('reflect_active_referral');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setBooking(parsed);
          activeId = parsed.id || parsed.referralId;
        } catch {
          setBooking(null);
        }
      } else {
        setBooking(null);
      }
    }

    if (activeId) {
      setLoading(true);
      fetchStatus(activeId);

      // Refresh every 30 seconds
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
      pollTimerRef.current = setInterval(() => {
        fetchStatus(activeId!);
      }, 30000);
    } else {
      setApiData(null);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [referralId, onRefreshTrigger, session]);

  // Handle local Cancel request
  const handleCancelLocal = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('reflect_active_referral');
      setBooking(null);
      setApiData(null);
    }
  };

  // Format confirmed_at date cleanly
  const formatConfirmedDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Determine variables with fallback to localStorage simulated values
  const rawStatus = apiData?.status || booking?.status?.toLowerCase() || 'pending';
  // Standardizing statuses to match: pending, confirmed, declined, reassigned
  let statusKey: 'pending' | 'confirmed' | 'declined' | 'reassigned' = 'pending';
  if (['confirmed', 'declined', 'reassigned'].includes(rawStatus)) {
    statusKey = rawStatus as any;
  } else if (rawStatus.includes('pending') || rawStatus.includes('review') || rawStatus.includes('awaiting')) {
    statusKey = 'pending';
  }

  const clinicName = apiData?.clinic_name || booking?.providerName || 'Partner Clinical Clinic';
  const showActiveDot = statusKey === 'pending' || statusKey === 'reassigned';

  // Status Badge configurations (bg, text, label)
  const badgeConfig = {
    pending: {
      bg: 'bg-amber-200 border-amber-300',
      text: 'text-amber-700',
      label: 'Awaiting confirmation'
    },
    confirmed: {
      bg: 'bg-sage-200 border-sage-300',
      text: 'text-sage-700',
      label: 'Confirmed \u2713'
    },
    declined: {
      bg: 'bg-rose-100 border-rose-250',
      text: 'text-rose-600',
      label: 'Being reassigned...'
    },
    reassigned: {
      bg: 'bg-amber-100 border-amber-200',
      text: 'text-amber-600',
      label: 'Reassigning to another clinic'
    }
  };

  const activeBadge = badgeConfig[statusKey] || badgeConfig.pending;

  // Render COMPACT card variant if specifically invoked with referralId (E.g. Step 7 dashboard integration)
  if (referralId) {
    if (loading && !apiData) {
      return (
        <div className="bg-white border border-ivory-200 rounded-2xl p-4 flex items-center justify-center font-mono text-[10px] text-ink-muted leading-none">
          <div className="w-3 h-3 border-2 border-t-transparent border-sage-600 rounded-full animate-spin mr-2" />
          Loading referral status...
        </div>
      );
    }

    if (error && !apiData) {
      return (
        <div className="bg-rose-50/50 border border-rose-250 rounded-2xl p-4 flex items-center gap-2 text-rose-700 text-xs text-left">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="font-medium font-body leading-relaxed">{error}</p>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white border border-ivory-200 rounded-2xl p-4 flex flex-col gap-3 text-left ${className}`}
      >
        <div className="flex justify-between items-center select-none">
          <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider font-mono">
            Your Appointment Request
          </span>
          <div className="flex items-center gap-1.5 leading-none">
            {showActiveDot && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sage-500"></span>
              </span>
            )}
            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border ${activeBadge.bg} ${activeBadge.text}`}>
              {activeBadge.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-ivory-100 pt-2.5">
          <div className="p-1.5 bg-sage-50 text-sage-600 border border-sage-100 rounded-lg shrink-0">
            <Building className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs font-bold text-ink leading-tight">
            {clinicName}
          </p>
        </div>

        {statusKey === 'confirmed' && apiData?.confirmed_at && (
          <div className="text-[10px] text-sage-700 bg-sage-50/60 border border-sage-100/50 rounded-xl p-2 font-mono flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Scheduled: {formatConfirmedDate(apiData.confirmed_at)}</span>
          </div>
        )}
      </motion.div>
    );
  }

  // Guidelines for booking consultations
  const guidelines = [
    { title: 'Secure a Private Environment', desc: 'Settle in a quiet, closed-door workspace with strong internet signal, zero ambient audio interference, and adequate lighting for screen viewing.' },
    { title: 'Share Assessment History', desc: 'Review your average trend indicators. You can reference or screenshot your Score Timeline and Symptom Breakdown charts from your History page as standard diagnostic reference materials.' },
    { title: 'Arrive 5 Minutes Early', desc: 'Telehealth protocols require clinical checklist validation. Login slightly early to authorize camera permissions and address credential sign-offs.' }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <AnimatePresence mode="popLayout">
        {booking || apiData ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white border border-ivory-200 rounded-3xl p-6 shadow-warm-xs text-left text-ink hover:shadow-warm-sm transition-shadow relative"
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-ivory-150 select-none">
              <div>
                <span className="text-[10px] font-semibold text-sage-600 uppercase tracking-widest font-mono">
                  Referral Consultation Info
                </span>
                <h4 className="font-display font-medium text-lg text-ink-soft mt-1 flex items-center gap-2">
                  <Building className="w-5 h-5 text-sage-600 shrink-0" />
                  {clinicName}
                </h4>
                <p className="text-xs text-ink-light font-mono font-medium mt-0.5">
                  Type: Telemedicine Consultation
                </p>
              </div>

              <div className="flex items-center gap-1.5 leading-none self-start sm:self-auto">
                {showActiveDot && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sage-500"></span>
                  </span>
                )}
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold border ${activeBadge.bg} ${activeBadge.text}`}>
                  {activeBadge.label}
                </span>
              </div>
            </div>

            {/* Time Slot Details */}
            <div className="py-4 grid grid-cols-2 gap-4 border-b border-ivory-150 text-left font-mono text-xs">
              <div className="flex items-center gap-2 text-ink-soft select-none">
                <CalendarDays className="w-4 h-4 text-sage-600 font-bold" />
                <div>
                  <div className="text-[9px] font-bold text-ink-muted uppercase leading-none">Date Scheduled</div>
                  <div className="font-bold text-ink mt-1 font-mono">
                    {booking?.date || 'Pending'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-ink-soft select-none">
                <Clock className="w-4 h-4 text-sage-600 font-bold" />
                <div>
                  <div className="text-[9px] font-bold text-ink-muted uppercase leading-none">Preferred Time</div>
                  <div className="font-bold text-ink mt-1 font-mono">
                    {booking?.timeSlot || 'Morning'}
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion Notes Brief */}
            {(booking?.brief || booking?.notes) && (
              <div className="py-4 text-xs leading-relaxed text-ink-light border-b border-ivory-150 text-left">
                <span className="text-[10px] font-semibold text-ink-muted uppercase font-mono tracking-wider block mb-1 select-none">
                  Intake Brief Summary
                </span>
                <p className="bg-ivory-50/50 p-3.5 border border-ivory-200/50 rounded-xl font-mono text-xs leading-relaxed">
                  "{booking?.brief || booking?.notes}"
                </p>
              </div>
            )}

            {statusKey === 'confirmed' && (apiData?.confirmed_at || booking?.confirmed_at) && (
              <div className="py-3 text-[11px] text-sage-700 bg-sage-50/50 border border-sage-100/50 rounded-xl p-3 font-mono flex items-center gap-2 my-2 select-none">
                <ShieldCheck className="w-4 h-4 text-sage-600 shrink-0" />
                <span>Confirmed appointment details finalized: {formatConfirmedDate(apiData?.confirmed_at || booking?.confirmed_at)}</span>
              </div>
            )}

            {/* Actions Footer */}
            <div className="pt-4 flex justify-between items-center bg-transparent">
              <div className="flex items-center gap-1.5 text-[10px] text-sage-600 font-mono font-medium select-none leading-none">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Provider status monitored safely
              </div>

              <button
                onClick={handleCancelLocal}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 p-2 rounded-xl transition-all outline-none cursor-pointer leading-none"
              >
                <Trash2 className="w-3.5 h-3.5" /> Cancel request
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white border border-dashed border-ivory-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-3"
          >
            <div className="p-3 bg-ivory-50 rounded-full border border-ivory-200 text-ink-light">
              <CalendarDays className="w-5 h-5 text-ink-muted" />
            </div>
            <h4 className="text-sm font-bold text-ink-soft select-none font-sans">
              No Pending Consultations
            </h4>
            <p className="text-xs text-ink-light leading-relaxed max-w-xs font-body">
              Your consultation desk is currently quiet. If your score timeline shows elevated symptoms, you can easily use our booking portal to request partner clinic appointments.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preparations Section */}
      <div className="bg-white border border-ivory-200 rounded-3xl p-6.5 text-left text-ink shadow-warm-xs">
        <h4 className="font-display font-medium text-lg text-ink-soft mb-2 select-none flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sage-600" />
          How to prepare for your consult
        </h4>
        <p className="text-xs text-ink-muted leading-relaxed mb-5 select-none font-body">
          Medical consultations or psychiatric explorations are fully supportive and confidential. Here is a helpful preparation checklist to get the most benefit from your clinic check-in:
        </p>

        <div className="space-y-4">
          {guidelines.map((g, idx) => (
            <div key={idx} className="flex gap-3 items-start text-xs border-b border-ivory-100 last:border-b-0 pb-3 last:pb-0">
              <div className="w-5 h-5 rounded-full bg-sage-50 text-sage-600 border border-sage-200/50 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="space-y-0.5">
                <h5 className="font-bold text-ink-soft leading-tight">{g.title}</h5>
                <p className="text-ink-light leading-relaxed font-body text-[11px]">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReferralStatus;
