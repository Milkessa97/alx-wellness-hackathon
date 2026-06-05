import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'motion/react';
import { PHQ9_QUESTIONS } from '../../lib/phq9';
import { saveAssessmentRecord } from '../../lib/analytics';
import { submitAssessment, APIError } from '../../lib/api';
import { AssessmentRecord } from '../../types';
import QuestionCard from './QuestionCard';
import Button from '../ui/Button';
import { Heart, X, AlertCircle, ChevronLeft, FileText, TrendingUp, Sparkles } from 'lucide-react';
import { LoadingOverlay } from './LoadingOverlay';

interface AssessmentShellProps {
  onComplete: (result: AssessmentRecord) => void;
  onCancel: () => void;
}

const MIN_QUESTION_TIME_MS = 1800;

// ── Progress Bar ───────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  const steps = Array.from({ length: total }, (_, i) => i);

  return (
    <div className="w-full mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[11px] font-mono font-bold tracking-widest text-ink-muted uppercase">
          Question {current + 1} of {total}
        </span>
        <span className="text-[11px] font-mono text-ink-light">
          {Math.round((current / total) * 100)}% complete
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {steps.map((step) => {
          const isCompleted = step < current;
          const isCurrent = step === current;
          return (
            <div key={step} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                animate={{
                  scale: isCurrent ? 1.2 : 1,
                  backgroundColor: isCompleted
                    ? '#4A8A63'
                    : isCurrent
                    ? '#7FAF93'
                    : '#EDE3CC',
                }}
                transition={{ duration: 0.25 }}
                className="w-2 h-2 rounded-full"
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 h-1 w-full bg-ivory-300 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-sage-500 rounded-full"
          animate={{ width: `${((current + 0.5) / total) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

// ── Time Lock Bar ──────────────────────────────────────────
function TimeLockBar({ isLocked, onUnlock }: { isLocked: boolean; onUnlock: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLocked) {
      setProgress(100);
      return;
    }
    setProgress(0);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / MIN_QUESTION_TIME_MS) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        onUnlock();
      }
    }, 30);
    return () => clearInterval(interval);
  }, [isLocked]);

  if (!isLocked) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        className="w-full mt-3"
      >
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-mono text-ink-light tracking-wider">
            Take a moment to reflect...
          </span>
          <span className="text-[10px] font-mono text-ink-light">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-0.5 w-full bg-ivory-300 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-amber-400 rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.03 }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main Shell ─────────────────────────────────────────────
export function AssessmentShell({ onComplete, onCancel }: AssessmentShellProps) {
  const { data: session } = useSession();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(9).fill(null));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isShowingOverlay, setIsShowingOverlay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShowingPreQ9Notice, setIsShowingPreQ9Notice] = useState(false);
  const pendingResult = useRef<AssessmentRecord | null>(null);

  const [isTimeLocked, setIsTimeLocked] = useState(true);
  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const questionArrivalTime = useRef<number>(Date.now());

  const currentQuestion = PHQ9_QUESTIONS[currentIndex];
  const totalQuestions = PHQ9_QUESTIONS.length;
  const currentSelectedScore = answers[currentIndex];

  useEffect(() => {
    setIsTimeLocked(true);
    setPendingScore(null);
    questionArrivalTime.current = Date.now();
  }, [currentIndex, isShowingPreQ9Notice]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleTimeLockRelease = () => {
    setIsTimeLocked(false);
    if (pendingScore !== null) {
      advanceWithScore(pendingScore);
      setPendingScore(null);
    }
  };

  const advanceWithScore = (score: number) => {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[currentIndex] = score;
      return copy;
    });

    setTimeout(() => {
      if (currentIndex === 7) {
        setDirection('forward');
        setIsShowingPreQ9Notice(true);
        setTimeout(() => {
          setIsShowingPreQ9Notice(false);
          setCurrentIndex(8);
        }, 7000);
      } else if (currentIndex < 8) {
        setDirection('forward');
        setCurrentIndex((prev) => prev + 1);
      } else {
        setAnswers((prev) => {
          const finalAnswers = [...prev];
          finalAnswers[8] = score;
          handleSubmit(finalAnswers.map((v) => v ?? 0));
          return finalAnswers;
        });
      }
    }, 400);
  };

  const handleSelectScore = (score: number) => {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[currentIndex] = score;
      return copy;
    });
    if (isTimeLocked) {
      setPendingScore(score);
    } else {
      advanceWithScore(score);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection('backward');
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async (finalAnswersArray: number[]) => {
    setIsShowingOverlay(true);
    setError(null);
    try {
      const token = (session as any)?.token || '';
      const apiResponse = await submitAssessment(finalAnswersArray, token);
      const totalScore =
        apiResponse.score ?? finalAnswersArray.reduce((acc, val) => acc + val, 0);
      const tier = apiResponse.tier;

      saveAssessmentRecord(totalScore, tier);
      sessionStorage.setItem('phq9_latest_response', JSON.stringify(apiResponse));
      sessionStorage.setItem(
        'phq9_result',
        JSON.stringify({ ...apiResponse, answers: finalAnswersArray })
      );

      pendingResult.current = {
        id: 'session-' + Date.now(),
        taken_at: new Date().toISOString(),
        score: totalScore,
        tier,
        answers: finalAnswersArray,
      };
      // onComplete fires only after overlay finishes its full sequence
    } catch (err: any) {
      setIsShowingOverlay(false);
      if (err instanceof APIError) setError(err.message);
      else setError('Check your connection and try again');
    }
  };

  return (
    <div className="w-full flex flex-col items-center h-full min-h-[560px]">

      {/* Progress bar */}
      {!isShowingPreQ9Notice && (
        <ProgressBar current={currentIndex} total={totalQuestions} />
      )}

      {/* Top nav row */}
      <div className="w-full flex justify-between items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="gap-1.5 -ml-2 text-ink-light hover:text-ink font-semibold"
        >
          Cancel
        </Button>
        <span className="text-[10px] font-mono font-bold tracking-widest text-ink-muted uppercase">
          PHQ-9 Protocol
        </span>
      </div>

      {/* Question card — flex-1 so it fills remaining height */}
      <div className="w-full bg-white border border-ivory-200 rounded-3xl p-6 md:p-8 shadow-warm-sm flex-1 flex flex-col justify-between relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {isShowingPreQ9Notice ? (
            <motion.div
              key="pre-q9-notice"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="my-auto text-center space-y-6 py-6"
            >
              <div
                className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 animate-pulse relative"
                style={{ boxShadow: '0 0 30px rgba(245, 158, 11, 0.15)' }}
              >
                <Heart className="w-8 h-8 fill-amber-400 text-amber-400" />
              </div>
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-600 uppercase">
                  Upcoming Module
                </span>
                <h3 className="font-display font-bold text-xl md:text-2xl text-amber-900 tracking-tight leading-snug">
                  Thoughtful reflection
                </h3>
                <p className="text-xs md:text-sm text-amber-850/80 leading-relaxed max-w-lg mx-auto font-medium px-4">
                  The upcoming question addresses vulnerable feelings about self-harm. Providing
                  accurate, honest responses helps establish a safe, medically safe, and educational
                  baseline report.
                </p>
              </div>
              <div className="flex justify-center items-center gap-2 pt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                  Loading next question...
                </span>
              </div>
            </motion.div>
          ) : (
            <QuestionCard
              key={currentIndex}
              question={currentQuestion}
              questionIndex={currentIndex}
              totalQuestions={totalQuestions}
              onAnswer={handleSelectScore}
              isQ9Notice={currentIndex === 8}
              selectedScore={currentSelectedScore}
              onBack={handlePrev}
              direction={direction}
            />
          )}
        </AnimatePresence>

        {/* Time lock bar — pinned to card bottom */}
        {!isShowingPreQ9Notice && (
          <TimeLockBar isLocked={isTimeLocked} onUnlock={handleTimeLockRelease} />
        )}
      </div>

      {/* Back button below card */}
      {currentIndex > 0 && !isShowingPreQ9Notice && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handlePrev}
          className="mt-3 flex items-center gap-1 text-xs text-ink-muted hover:text-ink transition-colors font-semibold"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous question
        </motion.button>
      )}

      {/* Loading overlay */}
      <AnimatePresence>
        {isShowingOverlay && (
          <LoadingOverlay
            onDone={() => {
              setIsShowingOverlay(false);
              if (pendingResult.current) {
                onComplete(pendingResult.current);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50 p-4 rounded-xl bg-rose-50 border-l-4 border-rose-600 shadow-xl flex items-start gap-3 border border-rose-200"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-left space-y-0.5">
              <h5 className="text-xs font-bold text-rose-800 uppercase tracking-wider font-sans">
                Submission Error
              </h5>
              <p className="text-xs md:text-sm text-rose-700 font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
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

export default AssessmentShell;