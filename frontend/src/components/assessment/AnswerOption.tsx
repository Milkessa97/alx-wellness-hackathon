import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';
import { AnswerOption as AnswerOptionType } from '../../types';

interface AnswerOptionProps {
  option: AnswerOptionType;
  isSelected: boolean;
  onSelect: (value: number) => void;
}

export function AnswerOption({ option, isSelected, onSelect }: AnswerOptionProps) {
  const handleClick = () => {
    // Call selection callback immediately (or let parent handle pagination/delay, but the spec says:
    // "After selection: 400ms delay then parent calls onAnswer (gives user time to see selection)"
    // Let's invoke onSelect immediately, and we can also add a brief delay in QuestionCard's navigation
    // or call onSelect with a 400ms delay. Let's call it with a 400ms delay to guarantee the user sees it!).
    onSelect(option.value);
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={!isSelected ? { scale: 1.02, transition: { duration: 0.15 } } : undefined}
      whileTap={{ scale: 0.98 }}
      animate={isSelected ? {
        backgroundColor: ['#FAE3B4', '#1A1A1A'],
        borderColor: ['#FAE3B4', '#1A1A1A'],
      } : {
        backgroundColor: '#FFFFFF',
        borderColor: '#EDE3CC',
      }}
      transition={{
        duration: 0.3,
        ease: 'easeInOut',
      }}
      className={clsx(
        "w-full text-left p-5 rounded-xl border flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sage-500 select-none transition-shadow",
        isSelected 
          ? "text-white shadow-warm-md" 
          : "hover:bg-ivory-200 hover:shadow-warm-sm text-ink-DEFAULT"
      )}
      id={`answer-option-${option.value}`}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Left: Large value indicator in a small circle */}
        <div className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm shrink-0 transition-colors duration-200",
          isSelected 
            ? "bg-amber-400 text-ink" 
            : "bg-ivory-200 text-ink-light"
        )}>
          {option.value}
        </div>

        {/* Center: Label & Sublabel */}
        <div className="flex flex-col text-left">
          <span className={clsx(
            "font-sans font-medium text-sm md:text-base leading-snug",
            isSelected ? "text-white" : "text-ink-soft"
          )}>
            {option.label}
          </span>
          <span className={clsx(
            "text-xs mt-0.5 font-sans font-medium line-clamp-1",
            isSelected ? "text-ivory-200" : "text-ink-light"
          )}>
            {option.sublabel}
          </span>
        </div>
      </div>

      {/* Right: Checkmark icon only visible when selected */}
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 18
              }}
              className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-ink"
            >
              <Check className="w-3 h-3 stroke-[3]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

export default AnswerOption;
