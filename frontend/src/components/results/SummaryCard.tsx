import { AssessmentRecord } from '../../types';
import { getSeverityLabel, PHQ9_QUESTIONS, calculatePHQ9Severity } from '../../lib/phq9';
import ProgressRibbon from '../ui/ProgressRibbon';
import { Calendar, HelpCircle, Activity, AlertCircle } from 'lucide-react';

interface SummaryCardProps {
  result: AssessmentRecord;
}

export function SummaryCard({ result }: SummaryCardProps) {
  const formattedDate = new Date(result.taken_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const q9Score = result.answers ? result.answers[8] : 0;
  const isQ9Flagged = q9Score > 0;
  const severity = calculatePHQ9Severity(result.score);

  return (
    <div className="bg-white border border-ivory-200 rounded-3xl shadow-warm-sm overflow-hidden font-body">
      {/* Top Banner section */}
      <div className="p-6 md:p-8 bg-gradient-to-br from-ink-soft via-ink to-ink-soft text-white relative">
        <div className="absolute top-4 right-4 text-white/5 pointer-events-none">
          <Activity className="w-24 h-24 stroke-[1.5]" />
        </div>
        
        <div className="flex flex-col gap-1 relative z-10">
          <div className="flex items-center gap-2.5 text-xs text-white/70 font-mono">
            <Calendar className="w-3.5 h-3.5 text-sage-400" />
            <span>{formattedDate}</span>
          </div>
          
          <div className="flex items-baseline gap-2.5 mt-4">
            <span className="font-display font-bold text-5xl md:text-6xl tracking-tight">
              {result.score}
            </span>
            <span className="text-white/60 font-mono text-sm md:text-base">
              / 27
            </span>
          </div>

          <p className="text-white/65 text-xs font-mono mt-1">Total PHQ-9 Score</p>
          
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-white/10 text-white border border-white/10 text-xs font-semibold rounded-full">
              {getSeverityLabel(severity)}
            </span>
            {isQ9Flagged && (
              <span className="px-3 py-1 bg-rose-600/30 text-rose-100 border border-rose-500/35 text-xs font-semibold rounded-full flex items-center gap-1.5 animate-pulse-soft">
                <AlertCircle className="w-3.5 h-3.5 text-rose-300" /> Question 9 Flagged
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Threshold spectrum track */}
      <div className="px-6 md:px-8 py-5 border-b border-ivory-200 bg-ivory-50">
        <label className="text-[11px] font-mono font-bold text-ink-muted uppercase tracking-wider block mb-3">
          Score Threshold Spectrum
        </label>
        <ProgressRibbon
          value={result.score}
          max={27}
          color="gradient"
          className="mb-2"
        />
        <div className="flex justify-between text-[11px] font-mono text-ink-light mt-1">
          <span>0 (Minimal)</span>
          <span>10 (Moderate)</span>
          <span>20 (Severe)</span>
        </div>
      </div>

      {/* Answer matrix grid breakdown */}
      <div className="p-6 md:p-8">
        <h5 className="font-display font-medium text-ink-soft text-sm mb-4 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-sage-600" /> Symptom Severity Matrix
        </h5>
        
        <div className="space-y-3.5">
          {PHQ9_QUESTIONS.map((questionData, idx) => {
            const score = result.answers ? result.answers[idx] : 0;

            return (
              <div 
                key={questionData.id} 
                className="flex items-center justify-between gap-4 p-3 bg-white hover:bg-ivory-50/50 border border-ivory-200 rounded-xl transition-colors duration-200"
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[10px] uppercase font-mono font-bold text-sage-600 block">
                    Q{questionData.id}: {questionData.shortLabel}
                  </span>
                  <p className="text-xs text-ink-soft truncate max-w-[280px] md:max-w-[400px]">
                    {questionData.text}
                  </p>
                </div>
                
                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg font-mono shrink-0 ${
                  score === 3 ? 'bg-rose-100 text-rose-600 border border-rose-200' :
                  score === 2 ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                  score === 1 ? 'bg-sage-100 text-sage-600 border border-sage-200/50' :
                  'bg-ivory-100 text-ink-light border border-ivory-300'
                }`}>
                  Score {score}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SummaryCard;
