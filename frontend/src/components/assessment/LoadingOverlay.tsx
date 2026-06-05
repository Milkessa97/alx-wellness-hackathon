import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, FileText, TrendingUp, Sparkles } from 'lucide-react';

interface LoadingOverlayProps {
  onDone: () => void;
}

const STEPS = [
  {
    main: 'Reading your responses...',
    sub: 'The PHQ-9 is a clinically validated tool used by healthcare providers worldwide.',
    icon: <FileText className="w-5 h-5 text-sage-600" />,
    fact: 'Checking in regularly is one of the most meaningful things you can do for your mental health.',
  },
  {
    main: 'Calculating your score...',
    sub: "Each answer is weighted to reflect how often you've been experiencing each feeling.",
    icon: <TrendingUp className="w-5 h-5 text-sage-600" />,
    fact: 'PHQ-9 scores are used by clinicians in over 80 countries to guide care conversations.',
  },
  {
    main: 'Building your reflection...',
    sub: 'Your report includes a personalised summary tailored to your results.',
    icon: <Sparkles className="w-5 h-5 text-sage-600" />,
    fact: 'People who receive written reflections on their mental health report feeling more understood.',
  },
  {
    main: 'Almost there...',
    sub: 'You did something courageous today. Honest self-reflection takes real strength.',
    icon: <Heart className="w-5 h-5 text-sage-600" />,
    fact: 'Sharing your results with a trusted person — a friend or clinician — can make a real difference.',
  },
];

const STEP_DURATION = 3200;
const BREATH_LABELS = ['Breathe in', 'Hold gently', 'Breathe out', 'Settle in'];

export function LoadingOverlay({ onDone }: LoadingOverlayProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [breathPhase, setBreathPhase] = useState(0);
  const [visible, setVisible] = useState(true);

  // Advance through steps — fire onDone only after all 4 complete
  useEffect(() => {
    if (stepIdx < STEPS.length - 1) {
      const t = setTimeout(() => setStepIdx((p) => p + 1), STEP_DURATION);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onDone, 400);
      }, STEP_DURATION);
      return () => clearTimeout(t);
    }
  }, [stepIdx, onDone]);

  // Breath cycle — independent 4s loop
  useEffect(() => {
    const t = setInterval(() => setBreathPhase((p) => (p + 1) % 4), 4000);
    return () => clearInterval(t);
  }, []);

  const step = STEPS[stepIdx];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          className="fixed inset-0 z-50 bg-ivory-100/92 backdrop-blur-md flex items-center justify-center p-6"
        >
          {/* Floating card */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="bg-white border border-ivory-200 rounded-3xl p-10 max-w-sm w-full flex flex-col items-center shadow-warm-md"
          >
            {/* Expanding rings + breathing orb */}
            <div
              className="relative flex items-center justify-center mb-8"
              style={{ width: 88, height: 88 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-sage-500/50"
                  style={{ width: 88, height: 88 }}
                  animate={{ scale: [1, 2.2], opacity: [0.5, 0] }}
                  transition={{
                    duration: 3.6,
                    repeat: Infinity,
                    ease: 'easeOut',
                    delay: i * 1.2,
                  }}
                />
              ))}
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-[52px] h-[52px] rounded-full bg-sage-500 flex items-center justify-center relative z-10"
              >
                <motion.div
                  animate={{ scale: [1, 0.88, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-5 h-5 rounded-full bg-ivory-100"
                />
              </motion.div>
            </div>

            {/* Breath cue */}
            <AnimatePresence mode="wait">
              <motion.span
                key={breathPhase}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-[11px] font-mono font-bold tracking-widest uppercase text-sage-600 mb-1"
              >
                {BREATH_LABELS[breathPhase]}
              </motion.span>
            </AnimatePresence>

            {/* Main message */}
            <AnimatePresence mode="wait">
              <motion.h3
                key={step.main}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.55 }}
                className="font-display font-semibold text-lg text-ink text-center leading-snug mt-1 mb-2"
              >
                {step.main}
              </motion.h3>
            </AnimatePresence>

            {/* Sub message */}
            <AnimatePresence mode="wait">
              <motion.p
                key={step.sub}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.55, delay: 0.05 }}
                className="text-xs text-ink-light text-center leading-relaxed mb-6 px-2"
              >
                {step.sub}
              </motion.p>
            </AnimatePresence>

            {/* Step dots */}
            <div className="flex gap-2 mb-6">
              {STEPS.map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    backgroundColor:
                      i < stepIdx ? '#4A8A63' : i === stepIdx ? '#7FAF93' : '#EDE3CC',
                    scale: i === stepIdx ? 1.35 : 1,
                  }}
                  transition={{ duration: 0.35 }}
                  className="w-[7px] h-[7px] rounded-full"
                />
              ))}
            </div>

            {/* Fact card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={step.fact}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55 }}
                className="w-full bg-ivory-100 rounded-2xl p-4 flex gap-3 items-start"
              >
                <div className="mt-0.5 shrink-0">{step.icon}</div>
                <p className="text-xs text-ink-muted leading-relaxed">{step.fact}</p>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LoadingOverlay;