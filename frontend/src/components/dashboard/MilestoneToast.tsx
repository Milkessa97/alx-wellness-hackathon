import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MilestoneToastProps {
  message: string;
  index?: number;
  key?: string | number;
}

export function MilestoneToast({ message, index = 0 }: MilestoneToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Toast auto-dismisses after 4 seconds + its stagger delay
    const totalTime = 4000 + (index * 500);
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, totalTime);

    return () => clearTimeout(timer);
  }, [index]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="floating-milestone-toast"
          initial={{ opacity: 0, y: 60, x: '-50%' }}
          animate={{ 
            opacity: [0, 1, 1, 0],
            y: [60, 0, 0, -20],
            x: '-50%'
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 4, 
            times: [0, 0.125, 0.875, 1], // 0.5s to fade/slide in, persistent until 3.5s, then 0.5s to slide up/fade out
            delay: index * 0.5,
            ease: "easeInOut"
          }}
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3.5 px-5 py-4 bg-sage-600 text-white rounded-2xl shadow-xl border border-sage-500/20 max-w-sm w-[90%] font-body"
        >
          {/* Trophy badge */}
          <div className="p-2 bg-sage-500 rounded-xl text-amber-300 shrink-0 shadow-inner">
            <Trophy className="w-5 h-5 fill-amber-450" />
          </div>

          <div className="flex-1 text-left">
            <span className="text-[9px] font-bold text-amber-200 uppercase tracking-widest font-mono">
              Milestone Unlocked!
            </span>
            <p className="text-xs md:text-sm font-semibold text-white leading-relaxed">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MilestoneToast;
