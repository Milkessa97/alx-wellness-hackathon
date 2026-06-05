import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AssessmentRecord, Recommendation } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { ScoreHistoryChart } from '../analytics/ScoreHistoryChart';
import { TierDistributionChart } from '../analytics/TierDistributionChart';
import { loadAnalytics } from '../../lib/analytics';
import { ChevronDown, ChevronUp, History, Sparkles, Heart, ShieldCheck } from 'lucide-react';
import TrendCard from '../dashboard/TrendCard';
import MilestoneToast from '../dashboard/MilestoneToast';

interface SafeResultProps {
  result: AssessmentRecord;
  recommendations: Recommendation[];
  trend?: { trend: string; delta: number | null; message: string } | null;
  milestones?: { id: string; message: string }[] | null;
}

export function SafeResult({ result, recommendations, trend, milestones }: SafeResultProps) {
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const data = loadAnalytics();
    if (data && data.history) {
      setHistory(data.history);
    }
  }, []);

  const fallbackSummary = "Your responses indicate that you are currently experiencing minimal to mild depressive symptoms. Your mood, energy levels, and overall interest in everyday activities appear well-balanced.\n\nThis is a strong baseline. To maintain this solid state, continue focusing on steady daily routines, proper sleep schedules, mindfulness practices, and regular physical activities. Tuning into your emotions through simple, safe checkpoints like these is a wonderful practice of self-care.";
  
  const summaryText = result.summary || fallbackSummary;
  const paragraphs = summaryText.split('\n\n').filter(p => p.trim().length > 0);

  // Stagger Container Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <div className="w-full space-y-8 font-body text-left relative">
      
      {/* Header Section with Floating Background Decoration */}
      <div className="relative flex flex-col items-center justify-center p-8 md:p-10 text-center overflow-hidden rounded-3xl bg-sage-100/30 border border-sage-200/50 shadow-warm-sm">
        {/* Floating Sage Background Shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <motion.div
            animate={{
              y: [0, -10, 0],
              x: [0, 8, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 7,
              ease: "easeInOut",
            }}
            className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-sage-100/65 blur-3xl "
          />
          <motion.div
            animate={{
              y: [0, 10, 0],
              x: [0, -8, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 9,
              ease: "easeInOut",
              delay: 1.5,
            }}
            className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-sage-100/40 blur-2xl animate-float"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {/* Animated SVG Checkmark Circle */}
          <div className="mb-5">
            <svg width="84" height="84" viewBox="0 0 80 80" fill="none" className="mx-auto" xmlns="http://www.w3.org/2000/svg">
              {/* Animated outer circle using custom strokeDashoffset animation */}
              <motion.circle
                cx="40"
                cy="40"
                r="36"
                stroke="#7FAF93" // sage-400
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="226"
                initial={{ strokeDashoffset: 226 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              {/* Inner checkmark using scale / pathLength effect */}
              <motion.path
                d="M28 40L36 48L52 32"
                stroke="#4A8A63" // sage-600
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
              />
            </svg>
          </div>

          <h3 className="font-display font-bold text-2xl md:text-3xl text-sage-900 mb-1 leading-tight select-none">
            You're doing well.
          </h3>
          <p className="text-sm md:text-base text-ink-muted leading-relaxed font-sans font-bold mb-4">
            Score: {result.score}/27 — Minimal to mild range
          </p>
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-sage-100 text-sage-600 font-mono text-[10px] md:text-xs font-bold rounded-full border border-sage-200/50 shadow-sm uppercase tracking-wider select-none">
            ✓ Safe tier
          </span>
        </div>
      </div>

      {trend && <TrendCard trend={trend} />}

      {/* Summary Card with Paragraph and Disclaimer animations */}
      <Card variant="safe" className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sage-950 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sage-600" /> Your personal reflection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Paragraph Stagger animations */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4 font-body text-ink-soft leading-[1.8] text-sm md:text-base"
          >
            {paragraphs.map((p, idx) => (
              <motion.p key={idx} variants={itemVariants}>
                {p}
              </motion.p>
            ))}
          </motion.div>

          <div className="my-6 border-t border-sage-200/50" />
          
          <p className="text-[11px] md:text-xs text-ink-light leading-relaxed font-sans font-medium">
            {result.disclaimer || "Disclaimer: This screening tool is psychoeducational and does not substitute for clinical mental health diagnosis. If you experience persistent depressive symptoms, low mood, or general changes to your psychological wellness, consider speaking with an accredited, professional medical consultant."}
          </p>
        </CardContent>
      </Card>

      {milestones && milestones.length > 0 && (
        <div className="space-y-3">
          {milestones.map((m, index) => (
            <MilestoneToast key={m.id} message={m.message} index={index} />
          ))}
        </div>
      )}

      {/* Preventive recommendations block */}
      <div className="space-y-4">
        <h4 className="font-display font-bold text-lg text-ink-soft flex items-center gap-2">
          <Heart className="w-5 h-5 text-sage-600 animate-pulse-soft" /> Recommended Action Pathways
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.slice(0, 2).map((rec, i) => (
            <div key={i} className="p-6 bg-white border border-ivory-200 rounded-2xl hover:border-sage-400/50 shadow-warm-sm hover:shadow-warm-md transition-all duration-300">
              <span className="inline-block px-2.5 py-0.5 bg-sage-50 text-sage-600 font-mono text-[9px] font-bold rounded-md tracking-wider uppercase border border-sage-200/30 mb-2.5">
                {rec.category}
              </span>
              <h5 className="font-display font-bold text-ink-soft text-sm md:text-base leading-snug">
                {rec.title}
              </h5>
              <p className="text-xs md:text-sm text-ink-light mt-2 leading-relaxed">
                {rec.description}
              </p>
              <div className="mt-4 pt-3 border-t border-ivory-200 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-sage-600 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-sage-700 leading-relaxed">
                  <span className="font-bold">Suggested action: </span>{rec.actionableStep}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsible Analytics Preview Widget if history tracking exists */}
      {history && history.length > 0 && (
        <div className="space-y-3 pt-2">
          <Card className="border border-ivory-200 p-5 md:p-6 bg-white rounded-2xl">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex justify-between items-center text-ink-soft hover:text-sage-700 transition-colors focus:outline-none cursor-pointer"
            >
              <span className="text-sm font-sans font-bold flex items-center gap-2 uppercase tracking-wide text-ink-muted">
                <History className="w-4 h-4 text-sage-650" />
                {isExpanded ? 'Hide analytical trends' : 'View your recent check-ins'}
              </span>
              {isExpanded ? <ChevronUp className="w-5 h-5 text-ink-muted" /> : <ChevronDown className="w-5 h-5 text-ink-muted" />}
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="overflow-hidden space-y-8"
                >
                  <div className="pt-6 border-t border-ivory-200 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Score trend timeline */}
                    <ScoreHistoryChart history={history} />
                    {/* Symptom breakdown map */}
                    <TierDistributionChart latestResult={result} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      )}
    </div>
  );
}

export default SafeResult;
