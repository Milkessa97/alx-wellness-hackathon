import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'motion/react';
import { PHQ9_QUESTIONS } from '../../lib/phq9';
import { saveAssessmentRecord } from '../../lib/analytics';
import { submitAssessment, APIError } from '../../lib/api';
import { AssessmentRecord } from '../../types';
import QuestionCard from './QuestionCard';
import ProgressRibbon from '../ui/ProgressRibbon';
import Button from '../ui/Button';
import { Heart, X, AlertCircle } from 'lucide-react';

interface AssessmentShellProps {
  onComplete: (result: AssessmentRecord) => void;
  onCancel: () => void;
}

// Full-screen loading overlay with a pulsing breathing circle and cycling loading messages
function LoadingOverlay() {
  const messages = [
    "Processing your responses...",
    "Preparing your reflection...",
    "Almost ready..."
  ];
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-ivory-100/90 backdrop-blur-md flex items-center justify-center p-6"
    >
      <div className="bg-white border border-ivory-200 rounded-3xl p-8 md:p-12 shadow-warm-xl max-w-sm w-full text-center space-y-8 flex flex-col items-center relative overflow-hidden" id="loading-overlay">
        {/* Breathing Orb Graphic */}
        <div className="relative w-28 h-28 flex items-center justify-center">
          <motion.div
            animate={{
              scale: [0.95, 1.05, 0.95],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-24 h-24 rounded-full bg-sage-400/30 filter blur-xl absolute"
          />
          <motion.div
            animate={{
              scale: [0.95, 1.05, 0.95],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="w-16 h-16 rounded-full bg-sage-500/10 border-2 border-sage-600/30 flex items-center justify-center relative shadow-inner"
          >
            <div className="w-5 h-5 rounded-full bg-sage-600 animate-pulse" />
          </motion.div>
        </div>

        {/* Cycling text logic */}
        <div className="h-12 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="text-sm md:text-base font-sans font-bold text-ink-muted"
            >
              {messages[msgIdx]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export function AssessmentShell({ onComplete, onCancel }: AssessmentShellProps) {
  const { data: session } = useSession();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(9).fill(null));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShowingPreQ9Notice, setIsShowingPreQ9Notice] = useState(false);

  const currentQuestion = PHQ9_QUESTIONS[currentIndex];
  const totalQuestions = PHQ9_QUESTIONS.length;
  const currentSelectedScore = answers[currentIndex];

  const answeredCount = answers.filter(val => val !== null).length;

  // Clear toast notifications automatically after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSelectScore = (score: number) => {
    // 1. Instantly update the list of answers to visually highlight selected feedback
    setAnswers(prev => {
      const copy = [...prev];
      copy[currentIndex] = score;
      return copy;
    });

    // 2. Advance / submit with a 400ms delay giving user visual feedback
    setTimeout(() => {
      if (currentIndex === 7) {
        // Trigger pre-Q9 notice moment
        setDirection('forward');
        setIsShowingPreQ9Notice(true);
        setTimeout(() => {
          setIsShowingPreQ9Notice(false);
          setCurrentIndex(8);
        }, 7000);
      } else if (currentIndex < 8) {
        setDirection('forward');
        setCurrentIndex(prev => prev + 1);
      } else {
        // Last question (index 8) -> trigger submission with latest completed answers
        setAnswers(prev => {
          const finalAnswers = [...prev];
          finalAnswers[8] = score;
          const readyAnswers = finalAnswers.map(v => v ?? 0);
          handleSubmit(readyAnswers);
          return finalAnswers;
        });
      }
    }, 400);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection('backward');
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async (finalAnswersArray: number[]) => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Call endpoint with active session token
      const token = (session as any)?.token || '';
      const apiResponse = await submitAssessment(finalAnswersArray, token);

      const totalScore = apiResponse.score ?? finalAnswersArray.reduce((acc, val) => acc + val, 0);
      const tier = apiResponse.tier;

      // Save using standard analytical utils
      saveAssessmentRecord(totalScore, tier);

      // Save to sessionStorage as requested
      sessionStorage.setItem('phq9_latest_response', JSON.stringify(apiResponse));
      sessionStorage.setItem('phq9_result', JSON.stringify({ ...apiResponse, answers: finalAnswersArray }));

      // Coordinate local assessment record
      const newRecord: AssessmentRecord = {
        id: 'session-' + Date.now(),
        taken_at: new Date().toISOString(),
        score: totalScore,
        tier: tier,
        answers: finalAnswersArray,
      };

      // Proceed to the results dashboard
      onComplete(newRecord);
    } catch (err: any) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Check your connection and try again');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Top Fixed Progress Ribbon */}
      <ProgressRibbon
        value={answeredCount}
        max={totalQuestions}
        color="sage"
        label="Assessment Progress"
      />

      {/* Top inline Navigation header */}
      <div className="w-full flex justify-between items-center mb-8 mt-16 md:mt-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="gap-1.5 -ml-2 text-ink-light hover:text-ink font-semibold"
        >
          Cancel Assessment
        </Button>
        <span className="text-xs font-mono font-bold tracking-widest text-ink-muted uppercase">
          Standard PHQ-9 Protocol
        </span>
      </div>

      <div className="w-full bg-white border border-ivory-200 rounded-3xl p-6 md:p-10 shadow-warm-sm min-h-[460px] flex flex-col justify-between relative overflow-hidden">
        {/* Sliding card transitions / Pre-Q9 Sensitivity Notice */}
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
                  The upcoming question addresses vulnerable feelings about self-harm. Providing accurate, honest responses helps establish a safe, medically safe, and educational baseline report.
                </p>
              </div>

              <div className="flex justify-center items-center gap-2 pt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                  Loading Screen...
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
      </div>

      {/* Full screen loading state overlay */}
      <AnimatePresence>
        {isSubmitting && <LoadingOverlay />}
      </AnimatePresence>

      {/* Spring animated toast notification on error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-50 p-4 rounded-xl bg-rose-50 border-l-4 border-rose-600 shadow-xl flex items-start gap-3 border border-rose-250"
            id="error-toast"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-left space-y-0.5">
              <h5 className="text-xs font-bold text-rose-800 uppercase tracking-wider font-sans">
                Submission Error
              </h5>
              <p className="text-xs md:text-sm text-rose-700 font-medium">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-450 hover:text-rose-600 p-0.5 rounded-lg hover:bg-rose-200/50 transition-colors cursor-pointer"
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
