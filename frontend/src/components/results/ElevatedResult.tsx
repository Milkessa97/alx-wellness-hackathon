import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AssessmentRecord, Recommendation } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { loadAnalytics } from '../../lib/analytics';
import { ScoreHistoryChart } from '../analytics/ScoreHistoryChart';
import { TierDistributionChart } from '../analytics/TierDistributionChart';
import { 
  Sun, 
  Info, 
  HelpCircle, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  History, 
  HeartHandshake, 
  AlertCircle 
} from 'lucide-react';
import TrendCard from '../dashboard/TrendCard';
import MilestoneToast from '../dashboard/MilestoneToast';

interface ElevatedResultProps {
  result: AssessmentRecord;
  recommendations: Recommendation[];
  trend?: { trend: string; delta: number | null; message: string } | null;
  milestones?: { id: string; message: string }[] | null;
}

export function ElevatedResult({ result, recommendations, trend, milestones }: ElevatedResultProps) {
  const [history, setHistory] = useState<AssessmentRecord[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const data = loadAnalytics();
    if (data && data.history) {
      setHistory(data.history);
    }
  }, []);

  const fallbackSummary = "Your answers indicate that you are experiencing moderate depressive symptoms, which can represent a heavy emotional weight. You might be struggling with a lack of cellular energy, interest, or erratic sleep schedules.\n\nWe recognize this is a stressful process. Coping with moderate feelings shouldn't be handled in absolute isolation. Be gentle with your body and mind over the upcoming days. Cultivate low-friction wellness goals, write out safe boundary logs, and prioritize talking about these feelings with peers, counselors, or professional partners.";
  
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
      
      {/* HEADER SECTION with Warm SVG / Sun and Ambient pulsing background */}
      <div className="relative flex flex-col items-center justify-center p-8 md:p-10 text-center overflow-hidden rounded-3xl bg-amber-100/35 border border-amber-200/50 shadow-warm-sm">
        {/* Floating decoration with a gentle amber/orange tone */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <motion.div
            animate={{
              y: [0, -12, 0],
              x: [0, 8, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 8,
              ease: "easeInOut",
            }}
            className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-amber-100/40 blur-3xl"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center">
          {/* Gentle animated Sun/Warmth icon with a pulsing outer amber glow */}
          <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
            <motion.div
              animate={{
                scale: [0.9, 1.1, 0.9],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute w-20 h-20 rounded-full bg-amber-300/40 filter blur-xl"
            />
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 35,
                repeat: Infinity,
                ease: "linear",
              }}
              className="relative z-10 w-12 h-12 rounded-full bg-amber-500/15 flex items-center justify-center border border-amber-400"
            >
              <Sun className="w-6 h-6 text-amber-600 fill-amber-300/30 stroke-[2]" />
            </motion.div>
          </div>

          <h3 className="font-display font-black text-2xl md:text-3xl text-amber-950 mb-1 leading-tight select-none">
            We see you.
          </h3>
          <p className="text-sm md:text-base text-amber-900/80 leading-relaxed font-sans font-extrabold mb-4">
            Score: {result.score}/27 — Moderate range
          </p>
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-150 text-amber-700 font-mono text-[10px] md:text-xs font-bold rounded-full border border-amber-250/50 shadow-sm uppercase tracking-wider select-none">
            ⚠ Elevated tier
          </span>
        </div>
      </div>

      {/* IMPORTANT NOTICE BOX: Animates in first with 0.3s delay */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="p-4 bg-amber-50/70 border-l-4 border-amber-400 rounded-r-xl flex items-start gap-3"
      >
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs md:text-sm text-amber-900 leading-relaxed font-medium">
          This reflection includes a note from our wellness team. Reading it fully is encouraged.
        </p>
      </motion.div>

      {trend && <TrendCard trend={trend} />}

      {/* SUMMARY CARD: Elevated variant with stagger text loading */}
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-amber-950 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-amber-600" /> Your reflection & analysis
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

          <div className="my-6 border-t border-amber-200/50" />
          
          {/* Disclaimer in a visually distinct block at the bottom */}
          <div className="p-4 bg-amber-100/60 rounded-xl flex items-start gap-2.5 border border-amber-200/40">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed font-sans font-medium">
              {result.disclaimer || "Disclaimer: This tool is for psychoeducational purposes and does not establish any professional diagnosis. If you recognize ongoing challenges to sleep, diet, social relationships, or somatic wellness, consulting a mental caregiver is critically beneficial."}
            </p>
          </div>
        </CardContent>
      </Card>

      {milestones && milestones.length > 0 && (
        <div className="space-y-3">
          {milestones.map((m, index) => (
            <MilestoneToast key={m.id} message={m.message} index={index} />
          ))}
        </div>
      )}

      {/* Recommended Action Pathways */}
      <div className="space-y-4">
        <h4 className="font-display font-bold text-lg text-ink-soft flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-amber-600" /> Recommended Support Pathways
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.slice(0, 2).map((rec, i) => (
            <div key={i} className="p-6 bg-white border border-ivory-200 rounded-2xl hover:border-amber-400/50 shadow-warm-sm hover:shadow-warm-md transition-all duration-300">
              <span className="inline-block px-2.5 py-0.5 bg-amber-50 text-amber-600 font-mono text-[9px] font-bold rounded-md tracking-wider uppercase border border-amber-200/30 mb-2.5">
                {rec.category}
              </span>
              <h5 className="font-display font-bold text-ink-soft text-sm md:text-base leading-snug">
                {rec.title}
              </h5>
              <p className="text-xs md:text-sm text-ink-light mt-2 leading-relaxed">
                {rec.description}
              </p>
              <div className="mt-4 pt-3 border-t border-ivory-200 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold text-amber-700 leading-relaxed">
                  <span className="font-bold">Suggested action: </span>{rec.actionableStep}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PROFESSIONAL SUPPORT NUDGE */}
      <div className="p-6 bg-amber-50/40 border border-amber-200/60 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-warm-sm">
        <div className="space-y-1 text-left">
          <h5 className="font-display font-bold text-amber-950 text-base">
            Talking to someone can help
          </h5>
          <p className="text-xs md:text-sm text-ink-muted leading-relaxed">
            If these feelings persist, speaking with a professional is a meaningful next step.
          </p>
        </div>
        <a 
          href="https://www.findahelpline.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center justify-center font-sans font-semibold text-xs md:text-sm px-5 py-2.5 bg-transparent border border-amber-500 text-amber-700 hover:bg-amber-100/50 rounded-xl transition-all cursor-pointer select-none self-start md:self-center"
        >
          Find support near you →
        </a>
      </div>

      {/* Collapsible Analytics Preview Widget if history tracking exists */}
      {history && history.length > 0 && (
        <div className="space-y-3 pt-2">
          <Card className="border border-ivory-200 p-5 md:p-6 bg-white rounded-2xl">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex justify-between items-center bg-sage-500 hover:bg-sage-600 text-white transition-colors focus:outline-none cursor-pointer px-4 py-3 rounded-xl"
            >
              <span className="text-sm font-sans font-bold flex items-center gap-2 uppercase tracking-wide">
                <History className="w-4 h-4" />
                {isExpanded ? 'Hide analytical trends' : 'View your recent check-ins'}
              </span>
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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

export default ElevatedResult;
