import { useMemo } from 'react';
import { AssessmentRecord } from '../../types';
import { 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  Sparkles, 
  Activity 
} from 'lucide-react';
import { motion } from 'motion/react';

interface TrendObject {
  trend: string;
  delta: number | null;
  message: string;
}

interface TrendCardProps {
  history?: AssessmentRecord[];
  trend?: TrendObject | null;
}

export function TrendCard({ history, trend }: TrendCardProps) {
  // If the new post-assessment 'trend' prop is supplied, render the dynamic compact alert
  if (trend !== undefined) {
    if (!trend || trend.trend === 'insufficient_data') {
      return null;
    }

    let bgClass = '';
    let textClass = '';
    let Icon = Minus;

    if (trend.trend === 'improving') {
      bgClass = 'bg-sage-100/60 border-sage-200/50';
      textClass = 'text-sage-700';
      Icon = TrendingUp;
    } else if (trend.trend === 'stable') {
      bgClass = 'bg-ivory-200/50 border-ivory-300/30';
      textClass = 'text-ink-muted';
      Icon = Minus;
    } else if (trend.trend === 'declining') {
      bgClass = 'bg-amber-100/60 border-amber-200/50';
      textClass = 'text-amber-700';
      Icon = TrendingDown;
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className={`w-full p-4 rounded-2xl border flex items-center gap-3 text-left ${bgClass} ${textClass}`}
      >
        <div className="p-2 bg-white/80 rounded-xl shrink-0 border border-current/10 shadow-sm">
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-xs md:text-sm font-semibold leading-relaxed">
          {trend.message}
        </p>
      </motion.div>
    );
  }

  // Fallback to original dashboard historical analytics if no 'trend' is provided but 'history' is
  const historyData = history || [];

  const trendReport = useMemo(() => {
    if (historyData.length < 2) {
      return {
        direction: 'stable' as const,
        avgScore: historyData.length === 1 ? historyData[0].score : 0,
        text: 'Insufficient data',
        description: 'Complete at least two check-ins to detect trends.',
        colorClass: 'text-ink-muted bg-ivory-50 border-ivory-200',
        badge: 'Pending'
      };
    }

    // Average calculation
    const totalScore = historyData.reduce((sum, item) => sum + item.score, 0);
    const avgScore = Math.round((totalScore / historyData.length) * 10) / 10;

    // Chronological order (oldest to newest) to detect direction
    const sorted = [...historyData].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime());
    
    // Compare last record vs previous
    const lastRecord = sorted[sorted.length - 1];
    const prevRecord = sorted[sorted.length - 2];

    const scoreDelta = lastRecord.score - prevRecord.score;

    if (scoreDelta < -1) {
      return {
        direction: 'improving' as const,
        avgScore,
        text: 'Improving trend',
        description: 'A decrease in scores indicates a healing and positive therapeutic trajectory.',
        colorClass: 'text-sage-700 bg-sage-50 border-sage-200/50',
        badge: 'Improving ✓'
      };
    } else if (scoreDelta > 1) {
      return {
        direction: 'elevating' as const,
        avgScore,
        text: 'Elevating score warning',
        description: 'Slight rising values noted. Prioritize rest, clinical exercises, or speak with counsel.',
        colorClass: 'text-amber-700 bg-amber-50 border-amber-200/50',
        badge: 'Elevating ⚠'
      };
    } else {
      return {
        direction: 'stable' as const,
        avgScore,
        text: 'Consistent stability',
        description: 'Your wellness check-ins reflect steady, consistent emotional baseline readings.',
        colorClass: 'text-ink bg-ivory-50 border-ivory-300/60',
        badge: 'Stable'
      };
    }
  }, [historyData]);

  const DashboardIcon = useMemo(() => {
    if (trendReport.direction === 'improving') return TrendingDown; // down in PHQ9 score is good!
    if (trendReport.direction === 'elevating') return TrendingUp;
    return Minus;
  }, [trendReport.direction]);

  return (
    <div className="bg-white border border-ivory-200 rounded-3xl p-6 shadow-warm-xs flex flex-col justify-between text-left h-full">
      <div className="space-y-4">
        <div className="flex justify-between items-center selection:none">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sage-100 text-sage-600 rounded-full shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="font-display font-bold text-lg text-ink-soft">
              Clinical Insights & Trend
            </h3>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider border ${trendReport.colorClass}`}>
            {trendReport.badge}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Main Average Score Gauge */}
          <div className="bg-ivory-50/50 rounded-2xl p-4 border border-ivory-100/60 flex flex-col justify-center">
            <span className="text-[10px] font-semibold text-ink-light uppercase tracking-widest block font-mono">
              Average Score
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-display font-black text-ink select-none leading-none">
                {trendReport.avgScore}
              </span>
              <span className="text-xs text-ink-muted leading-none">/ 27</span>
            </div>
            <span className="text-[9px] font-medium text-sage-600 block mt-1 font-mono">
              Over {historyData.length} {historyData.length === 1 ? 'assessment' : 'assessments'}
            </span>
          </div>

          {/* Trend Indicator Panel */}
          <div className="bg-ivory-50/50 rounded-2xl p-4 border border-ivory-100/60 flex flex-col justify-center">
            <span className="text-[10px] font-semibold text-ink-light uppercase tracking-widest block font-mono">
              Directional Shift
            </span>
            <div className="flex items-center gap-2 mt-1.5 select-none text-ink">
              <div className={`p-1 rounded-lg ${
                trendReport.direction === 'improving' ? 'bg-sage-100 text-sage-700' :
                trendReport.direction === 'elevating' ? 'bg-amber-100 text-amber-700' :
                'bg-ivory-200/60 text-ink-muted'
              }`}>
                <DashboardIcon className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-sm leading-tight">
                {trendReport.text}
              </span>
            </div>
          </div>
        </div>

        {/* Informative advice message based on diagnosis */}
        <p className="text-xs text-ink-muted leading-relaxed font-body">
          {trendReport.description}
        </p>
      </div>

      {historyData.length >= 2 && (
        <div className="mt-5 pt-4 border-t border-ivory-100 bg-sage-50/30 p-3.5 rounded-2xl border border-sage-100/50 flex gap-2.5 items-start">
          <Sparkles className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-sage-700 leading-normal font-sans">
            <strong>Reflection Recommendation:</strong> Your scores indicate {trendReport.direction === 'improving' ? 'robust coping mechanisms are working. Keep up your therapeutic mindfulness routine!' : 'consistency. Focus on diaphragmatic breathing and write 3 micro-journals this evening.'}
          </p>
        </div>
      )}
    </div>
  );
}

export default TrendCard;
