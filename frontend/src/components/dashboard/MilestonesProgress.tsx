import { useMemo } from 'react';
import { AssessmentRecord } from '../../types';
import { Award, CheckCircle2, Lock, Medal, Star } from 'lucide-react';
import { motion } from 'motion/react';

interface MilestonesProgressProps {
  history: AssessmentRecord[];
  className?: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  badge: string;
  requirementText: string;
  isUnlocked: boolean;
  xpNeeded: number; // For clean visualization progress
  xpEarned: number;
}

export function MilestonesProgress({ history, className = '' }: MilestonesProgressProps) {
  const count = history ? history.length : 0;

  const milestones: Milestone[] = useMemo(() => {
    return [
      {
        id: 'first-step',
        title: 'Diagnostic Inception',
        description: 'First courageous step in documenting clinical emotional symptoms.',
        badge: 'Inception',
        requirementText: 'Complete 1 self-check-in',
        isUnlocked: count >= 1,
        xpNeeded: 1,
        xpEarned: count >= 1 ? 1 : 0,
      },
      {
        id: 'routine-builder',
        title: 'Habit Formation',
        description: 'Creating a routine to monitor patterns over distinct biological intervals.',
        badge: 'Routine',
        requirementText: 'Complete 3 self-check-ins',
        isUnlocked: count >= 3,
        xpNeeded: 3,
        xpEarned: Math.min(count, 3),
      },
      {
        id: 'pattern-genius',
        title: 'Reflective Baseline',
        description: 'Gathering clinical telemetry to formulate solid average wellness trends.',
        badge: 'Self-Aware',
        requirementText: 'Complete 5 self-check-ins',
        isUnlocked: count >= 5,
        xpNeeded: 5,
        xpEarned: Math.min(count, 5),
      }
    ];
  }, [count]);

  const unlockedCount = milestones.filter(m => m.isUnlocked).length;

  return (
    <div className={`bg-white border border-ivory-200 rounded-3xl p-6 shadow-warm-xs text-left ${className}`}>
      <div className="flex justify-between items-center select-none mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-full shrink-0 border border-amber-200/40">
            <Award className="w-4 h-4" />
          </div>
          <h3 className="font-display font-bold text-lg text-ink-soft">
            Clarity Milestones
          </h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-sage-600 bg-sage-100/50 border border-sage-200/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          {unlockedCount} / {milestones.length} Unlocked
        </span>
      </div>

      <div className="space-y-4">
        {milestones.map((milestone, idx) => {
          const progressPercent = (milestone.xpEarned / milestone.xpNeeded) * 100;

          return (
            <motion.div 
              key={milestone.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.25 }}
              className={`p-4 rounded-2xl border transition-all ${
                milestone.isUnlocked 
                  ? 'bg-sage-50/40 border-sage-200/50 hover:bg-sage-50/70' 
                  : 'bg-ivory-50/50 border-ivory-100/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Circle indicator */}
                  <div className={`p-2 rounded-xl shrink-0 border ${
                    milestone.isUnlocked
                      ? 'bg-sage-600 text-white border-sage-500'
                      : 'bg-ivory-200 text-ink-muted border-ivory-300/40'
                  }`}>
                    {milestone.isUnlocked ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold text-ink-soft flex items-center gap-1.5 leading-none">
                      {milestone.title}
                      {milestone.isUnlocked && (
                        <span className="px-1.5 py-0.5 rounded bg-sage-200 text-sage-800 font-mono text-[80%] font-black select-none tracking-wide">
                          {milestone.badge}
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-ink-light leading-relaxed mt-1 font-body">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Individual progress meter */}
              {!milestone.isUnlocked && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[9px] font-semibold uppercase tracking-wider font-mono text-ink-muted select-none">
                    <span>{milestone.requirementText}</span>
                    <span>{milestone.xpEarned} / {milestone.xpNeeded} Done</span>
                  </div>
                  <div className="w-full h-1.5 bg-ivory-100 rounded-full overflow-hidden border border-ivory-200/50">
                    <div 
                      className="h-full bg-sage-500 rounded-full transition-all duration-300" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default MilestonesProgress;
