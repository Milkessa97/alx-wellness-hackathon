import React, { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Calendar, Clock, User, Mail, Phone, FileText, Check } from 'lucide-react';
import Button from '../ui/Button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { submitBooking, APIError } from '../../lib/api';
import { BookingFormData } from '../../types';

interface BookingFormProps {
  score: number;
  tier: string;
  onSuccess?: () => void;
  className?: string;
}

interface ValidationErrors {
  fullName?: string;
  email?: string;
  preferredDate?: string;
  preferredTime?: string;
  consent?: string;
}

export function BookingForm({ score, tier, onSuccess, className = '' }: BookingFormProps) {
  const { data: session } = useSession();

  // State fields matching the referrals Supabase expectations
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('Morning');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);

  // Status and error management
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successBody, setSuccessBody] = useState('');
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [toastError, setToastError] = useState<string | null>(null);

  // Pre-fill fields from session if available
  useEffect(() => {
    if (session?.user?.name) {
      setFullName((prev) => prev || session.user.name || '');
    }
    if (session?.user?.email) {
      setEmail((prev) => prev || session.user.email || '');
    }
  }, [session]);

  // Precedence for tier range tags
  const getTierRangeText = () => {
    if (tier === 'elevated' || score >= 10) {
      return 'Moderate range';
    }
    return 'Mild range';
  };

  // Min date string representation: today + 3 days
  const getMinDate = () => {
    const minDateObj = new Date();
    minDateObj.setDate(minDateObj.getDate() + 3);
    return minDateObj.toISOString().split('T')[0];
  };

  const validate = (): boolean => {
    const errors: ValidationErrors = {};
    
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 chars.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!preferredDate) {
      errors.preferredDate = 'Preferred date is required.';
    } else {
      const selected = new Date(preferredDate);
      const minDate = new Date(getMinDate());
      selected.setHours(0,0,0,0);
      minDate.setHours(0,0,0,0);
      if (selected < minDate) {
        errors.preferredDate = 'Preferred date must be at least 3 days in the future.';
      }
    }

    if (!preferredTime) {
      errors.preferredTime = 'Preferred time is required.';
    }

    if (!consent) {
      errors.consent = 'You must give consent to proceed.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToastError(null);

    if (!validate()) {
      setToastError('Please fix the validation errors before submitting.');
      return;
    }

    const token = (session as any)?.token;
    if (!token) {
      // Not signed in (or session expired) — send the user through sign-in.
      await signIn('google');
      return;
    }

    setIsPending(true);

    try {
      const payload: BookingFormData = {
        patient_name: fullName.trim(),
        patient_email: email.trim(),
        patient_phone: phone.trim() || undefined,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        notes: notes.trim() || undefined,
        phq9_score: score,
        phq9_tier: tier,
      };

      const responseData = await submitBooking(payload, token);

      setSuccessBody(responseData.message || "Your appointment request has been submitted successfully. Our clinicians will review and match you with one of our trusted partner providers. You should hear back in 24–48 hours.");
      setIsSuccess(true);

      // Save newly registered booking details to localStorage for side panel integration
      if (typeof window !== 'undefined') {
        const refId = responseData.referral_id || "mock-ref-id";
        const localBooking = {
          providerName: responseData.clinic_name || "Partner Clinical Clinic",
          discipline: "Telemedicine Review",
          status: "Pending Clinical Review",
          date: preferredDate,
          timeSlot: preferredTime,
          brief: notes,
          id: refId
        };
        localStorage.setItem('reflect_active_referral', JSON.stringify(localBooking));
        localStorage.setItem('maedot_referral_id', refId);
      }

      // Clear booking context on success
      sessionStorage.removeItem('maedot_booking_context');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      if (err instanceof APIError) {
        // Crisis tier — backend refuses booking; redirect home quietly.
        if (err.status === 400) {
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
          return;
        }
        // Token rejected/expired — re-authenticate.
        if (err.status === 401) {
          await signIn('google');
          return;
        }
      }
      console.error('Error submitting appointment:', err);
      setToastError(err.message || 'A transmission error occurred while sending your request. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  const handleNavigateDashboard = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/dashboard');
      window.dispatchEvent(new Event('navigationchange'));
    }
  };

  const handleNavigateHome = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new Event('navigationchange'));
    }
  };

  // Success screen state
  if (isSuccess) {
    return (
      <div className="bg-white border border-ivory-200 rounded-3xl p-8 max-w-xl mx-auto shadow-warm-md text-center space-y-6">
        {/* SVG checkmark draw animation */}
        <div className="mx-auto w-16 h-16 rounded-full bg-sage-50 border border-sage-200/50 flex items-center justify-center">
          <svg
            className="w-8 h-8 stroke-current text-sage-600 fill-none"
            viewBox="0 0 24 24"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M20 6L9 17L4 12"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </svg>
        </div>

        <div className="space-y-2 select-none">
          <h3 className="font-display font-extrabold text-2xl text-ink">
            Request sent.
          </h3>
          <p className="text-sm text-ink-muted leading-relaxed font-body max-w-md mx-auto">
            {successBody}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Button
            variant="primary"
            onClick={handleNavigateDashboard}
            className="px-8 py-3 bg-sage-600 hover:bg-sage-700 text-white font-sans text-xs font-bold rounded-xl shadow-warm-sm"
          >
            Back to Dashboard
          </Button>

          <button
            onClick={handleNavigateHome}
            className="text-xs font-medium text-ink-muted hover:text-ink transition-colors underline cursor-pointer"
          >
            Take me home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Card variant="default" className="max-w-xl mx-auto relative overflow-hidden">
        <CardHeader className="text-left pb-4 mb-5 border-b border-ivory-200/50 flex flex-col items-start justify-between sm:flex-row sm:items-center gap-4">
          <div className="space-y-1 select-none">
            <CardTitle className="font-display font-extrabold text-xl text-ink leading-tight">
              Request an Appointment
            </CardTitle>
            <CardDescription className="text-xs text-ink-light leading-relaxed max-w-sm">
              Fill in your details and we'll match you with a partner clinic. You'll hear back within 24–48 hours.
            </CardDescription>
          </div>
          
          <span className="shrink-0 px-3 py-1.5 bg-sage-50 border border-sage-200/60 text-sage-700 font-mono text-[10px] md:text-xs font-extrabold rounded-full uppercase tracking-wider select-none leading-none">
            {getTierRangeText()}
          </span>
        </CardHeader>

        <CardContent className="text-left">
          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider font-mono flex items-center gap-1.5 leading-none">
                <User className="w-3.5 h-3.5 text-sage-600" /> Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="E.g., Jane Doe"
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  formErrors.fullName ? 'border-rose-450 focus:border-rose-500' : 'border-ivory-200 focus:border-sage-400'
                } focus:outline-none text-xs text-ink-soft bg-ivory-50/20 font-mono`}
              />
              {formErrors.fullName && (
                <p className="text-[10px] font-bold text-rose-600 mt-1 select-none">
                  {formErrors.fullName}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider font-mono flex items-center gap-1.5 leading-none">
                <Mail className="w-3.5 h-3.5 text-sage-600" /> Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E.g., jane@example.com"
                className={`w-full px-4 py-2.5 rounded-xl border ${
                  formErrors.email ? 'border-rose-450 focus:border-rose-500' : 'border-ivory-200 focus:border-sage-400'
                } focus:outline-none text-xs text-ink-soft bg-ivory-50/20 font-mono`}
              />
              {formErrors.email && (
                <p className="text-[10px] font-bold text-rose-600 mt-1 select-none">
                  {formErrors.email}
                </p>
              )}
            </div>

            {/* Phone (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider font-mono flex items-center gap-1.5 leading-none">
                <Phone className="w-3.5 h-3.5 text-sage-600" /> Phone (optional)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="E.g., +1 234 567 8900"
                className="w-full px-4 py-2.5 rounded-xl border border-ivory-200 focus:border-sage-400 focus:outline-none text-xs text-ink-soft bg-ivory-50/20 font-mono"
              />
            </div>

            {/* Grid for Preferred Date & Preferred Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preferred Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider font-mono flex items-center gap-1.5 leading-none">
                  <Calendar className="w-3.5 h-3.5 text-sage-600" /> Preferred date
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  min={getMinDate()}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border ${
                    formErrors.preferredDate ? 'border-rose-450 focus:border-rose-500' : 'border-ivory-200 focus:border-sage-400'
                  } focus:outline-none text-xs text-ink-soft bg-ivory-50/20 font-mono`}
                />
                {formErrors.preferredDate && (
                  <p className="text-[10px] font-bold text-rose-600 mt-1 select-none">
                    {formErrors.preferredDate}
                  </p>
                )}
              </div>

              {/* Preferred Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider font-mono flex items-center gap-1.5 leading-none">
                  <Clock className="w-3.5 h-3.5 text-sage-600" /> Preferred time
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-ivory-200 focus:border-sage-400 focus:outline-none text-xs text-ink-soft bg-ivory-50/20 font-mono cursor-pointer"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                </select>
                {formErrors.preferredTime && (
                  <p className="text-[10px] font-bold text-rose-600 mt-1 select-none">
                    {formErrors.preferredTime}
                  </p>
                )}
              </div>
            </div>

            {/* Notes (Optional) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline select-none">
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider font-mono flex items-center gap-1.5 leading-none">
                  <FileText className="w-3.5 h-3.5 text-sage-600" /> Anything else we should know? (optional)
                </label>
                <span className="text-[10px] text-ink-light font-mono font-medium leading-none">
                  {300 - notes.length} left
                </span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 300))}
                placeholder="E.g., Any scheduling requirements, language preferences, or treatment requests..."
                rows={3}
                maxLength={300}
                className="w-full p-4 rounded-xl border border-ivory-200 focus:border-sage-400 focus:outline-none text-xs text-ink-soft bg-ivory-50/20 font-mono resize-none leading-relaxed"
              />
            </div>

            {/* Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <div className="relative flex items-center mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border transition-all ${
                    consent ? 'bg-sage-650 border-sage-650' : 'bg-transparent border-ivory-300'
                  } flex items-center justify-center`}>
                    {consent && <Check className="w-3 h-3 text-white stroke-[3.5]" />}
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[10px] font-medium text-ink-muted leading-relaxed">
                    I consent to my contact details and assessment tier being shared with a partner clinic for the purpose of arranging an appointment.
                  </span>
                  {formErrors.consent && (
                    <p className="text-[10px] font-bold text-rose-600 mt-0.5">
                      {formErrors.consent}
                    </p>
                  )}
                </div>
              </label>
            </div>

            {/* Submit */}
            <div className="pt-3 border-t border-ivory-200/50">
              <Button
                type="submit"
                variant="primary"
                loading={isPending}
                fullWidth
                className="py-3 bg-sage-600 hover:bg-sage-700 text-white border-transparent"
              >
                Send Appointment Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Elegant, fixed-bottom error toast if any */}
      <AnimatePresence>
        {toastError && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50 p-4 rounded-xl bg-rose-50 border-l-4 border-rose-600 shadow-xl flex items-start gap-3 border border-rose-200"
            id="error-toast"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-left space-y-0.5">
              <h5 className="text-xs font-bold text-rose-800 uppercase tracking-wider font-sans leading-none">
                Request Error
              </h5>
              <p className="text-xs text-rose-700 font-medium font-body leading-normal">
                {toastError}
              </p>
            </div>
            <button
              onClick={() => setToastError(null)}
              className="text-rose-400 hover:text-rose-600 p-0.5 rounded-lg hover:bg-rose-200/50 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BookingForm;
