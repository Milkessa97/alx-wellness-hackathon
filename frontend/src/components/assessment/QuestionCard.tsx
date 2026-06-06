import React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { PHQ9Question } from '../../types';
import { ANSWER_OPTIONS } from '../../lib/phq9';
import { Heart, ArrowLeft, ShieldCheck } from 'lucide-react';
import Button from '../ui/Button';
import { AnswerOption } from './AnswerOption';

interface QuestionCardProps {
  key?: React.Key;
  question: PHQ9Question;
  questionIndex: number; // 0-indexed
  totalQuestions: number;
  onAnswer: (value: number) => void;
  isQ9Notice: boolean;
  selectedScore?: number | null;
  onBack?: () => void;
  direction?: 'forward' | 'backward';
}

const cardVariants = {
  enter: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: 'forward' | 'backward') => ({
    x: direction === 'forward' ? -80 : 80,
    opacity: 0,
  }),
};

export function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  onAnswer,
  isQ9Notice,
  selectedScore = null,
  onBack,
  direction = 'forward',
}: QuestionCardProps) {
  
  // Stagger options container
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: isQ9Notice ? 0.4 : 0.15,
      },
    },
  };

  const optionVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 17,
      },
    },
  };

  return (
    <motion.div
      custom={direction}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        duration: 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="w-full flex flex-col focus:outline-none"
    >
      {/* Header Info: Badge & Steps */}
      <div className="flex justify-between items-center mb-6">
        <span className="px-3.5 py-1 bg-sage-50 text-sage-600 font-mono text-[10px] md:text-xs font-bold rounded-full tracking-wider uppercase border border-sage-200/50">
          Symptom: {question.shortLabel}
        </span>
        <span className="text-xs md:text-sm text-ink-light font-mono font-bold">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
      </div>

      {/* Sensitive Topic Notice box before Q9 */}
      {isQ9Notice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-600 mt-0.5">
            <Heart className="w-4 h-4 fill-amber-500 text-amber-500" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider font-sans">
              Safety Notice
            </h4>
            <p className="text-xs md:text-sm text-amber-700/90 leading-relaxed font-medium">
              The next question asks about thoughts of self-harm. It is included because it matters for your wellbeing. You are safe to answer honestly.
            </p>
          </div>
        </motion.div>
      )}

      {/* Main Question Text */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="font-display font-black text-2xl md:text-3.5xl text-ink leading-tight tracking-tight mb-8 text-left"
      >
        {question.text}
      </motion.h2>

      {/* Answer options matrix (Single column vertical grid) */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-2"
      >
        {ANSWER_OPTIONS.map((option, index) => {
          const isSelected = selectedScore === option.value;
          return (
            <motion.div
              key={option.value}
              variants={optionVariants}
              className="w-full"
            >
              <AnswerOption
                option={option}
                isSelected={isSelected}
                onSelect={onAnswer}
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Under-the-card subtle previous button and privacy note */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-ivory-200/70">
        {questionIndex > 0 && onBack ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1.5 text-xs text-ink-light hover:text-ink font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Previous Question
          </Button>
        ) : (
          <div />
        )}
        
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold tracking-wider uppercase text-sage-600">
          <ShieldCheck className="w-3.5 h-3.5" /> Safe Space
        </span>
      </div>
    </motion.div>
  );
}

export default QuestionCard;
