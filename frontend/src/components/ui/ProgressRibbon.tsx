import { motion } from 'motion/react';
import { clsx } from 'clsx';

interface ProgressRibbonProps {
  value: number; // For questions: current question index. For scores: the score itself.
  max: number;   // Max scale (e.g. 9 for questions, 27 for PHQ-9 score).
  color?: 'sage' | 'gradient' | 'red' | 'amber';
  label?: string;
  className?: string;
}

export function ProgressRibbon({ value, max, color = 'sage', label, className }: ProgressRibbonProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const isAssessment = color === 'sage';

  if (isAssessment) {
    // Assessment progress bar: Fixed at the top of the viewport during assessment
    return (
      <div className={clsx("fixed top-0 left-0 right-0 z-50 bg-ivory-50/95 backdrop-blur-md border-b border-ivory-200 py-3.5 px-6 shadow-warm-sm flex items-center justify-between gap-6", className)}>
        <div className="flex flex-col gap-0.5 max-w-[200px] md:max-w-xs">
          <span className="text-[10px] font-mono font-bold text-sage-600 uppercase tracking-widest leading-none">
            Assessment Status
          </span>
          <span className="text-xs font-sans font-bold text-ink-muted">
            {value} of {max} complete
          </span>
        </div>

        {/* Progress Track (ivory-200 track, ink fill) */}
        <div className="flex-1 max-w-lg h-2 bg-ivory-200 rounded-full relative overflow-visible">
          <motion.div
            layoutId="assessmentProgressFill"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 30,
            }}
            className="h-full bg-ink rounded-full relative overflow-visible"
          >
            {/* Travelling small animated dot */}
            <motion.div
              layoutId="assessmentProgressDot"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-ink rounded-full shadow-warm-md"
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.1, 1] }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 30,
              }}
            />
          </motion.div>
        </div>

        <div className="text-xs font-sans font-black text-ink-soft shrink-0">
          {Math.round(percentage)}%
        </div>
      </div>
    );
  }

  // Otherwise, render as a regular inline track (e.g. results/spectrum card)
  return (
    <div className={clsx("w-full flex flex-col gap-2", className)}>
      {(label || value !== undefined) && (
        <div className="flex justify-between items-center text-xs font-mono text-ink-light">
          <span>{label}</span>
          <span className="font-bold text-ink-soft">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="w-full h-2.5 bg-ivory-200 rounded-full relative overflow-visible">
        <motion.div
          layoutId="spectrumFill"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 30,
          }}
          className={clsx("h-full rounded-full relative overflow-visible", {
            "bg-gradient-to-r from-sage-400 via-amber-400 to-rose-600": color === 'gradient',
            "bg-rose-600": color === 'red',
            "bg-amber-400": color === 'amber',
          })}
        >
          {/* Animated dot on regular ribbon too for extra craft! */}
          <motion.div
            className={clsx("absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-warm-md border-2", {
              "border-rose-600": color === 'red' || (color === 'gradient' && percentage > 70),
              "border-amber-400": color === 'amber' || (color === 'gradient' && percentage <= 70 && percentage > 30),
              "border-sage-400": color === 'gradient' && percentage <= 30,
            })}
          />
        </motion.div>
      </div>
    </div>
  );
}

export default ProgressRibbon;
