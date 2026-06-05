import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AssessmentRecord, Recommendation } from '../../types';
import SafeResult from '../../components/results/SafeResult';
import ElevatedResult from '../../components/results/ElevatedResult';
import CrisisResult from '../../components/results/CrisisResult';
import Button from '../../components/ui/Button';
import { PremiumGate } from '../../components/ui/PremiumGate';
import { RefreshCw, Home, Calendar, ArrowRight } from 'lucide-react';

export function fetchClinicalRecommendations(score: number): Recommendation[] {
  if (score >= 20) {
    return [
      {
        title: 'Immediate Crisis Support Network',
        category: 'Urgent',
        description: 'Your score reflects severe symptoms. Please connect with professional support immediately.',
        actionableStep: 'Reach out to the 988 Lifeline by calling or texting 988.',
      },
      {
        title: 'Schedule Professional Evaluation',
        category: 'Medical',
        description: 'A licensed healthcare provider is essential for diagnostic evaluation, therapy, and consultation.',
        actionableStep: 'Contact a psychiatrist, psychologist, or primary care doctor today.',
      },
    ];
  } else if (score >= 10) {
    return [
      {
        title: 'Cognitive Behavioral Therapy (CBT)',
        category: 'Therapy',
        description: 'CBT is highly effective for moderate symptoms, focusing on restructuring unhelpful thoughts.',
        actionableStep: 'Search directories like Psychology Today for CBT certified therapists.',
      },
      {
        title: 'Behavioral Activation Plans',
        category: 'Self-Care',
        description: 'Intentionally scheduling rewarding or peaceful activities can boost mood patterns.',
        actionableStep: 'Select one minor activity (e.g., a 15-minute walk) and schedule it for tomorrow.',
      },
    ];
  } else {
    return [
      {
        title: 'Mindfulness and Grounding',
        category: 'Prevention',
        description: 'Establishing daily deep-breathing routines helps build psychological resilience.',
        actionableStep: 'Practice deep breathing for 3 minutes during transition times.',
      },
      {
        title: 'Sleep Hygiene Optimization',
        category: 'Lifestyle',
        description: 'Consistent sleep schedules guard against low energy and negative ruminating habits.',
        actionableStep: 'Establish a screen-free winding-down routine 1 hour before bedtime.',
      },
    ];
  }
}

// ── Tier config ────────────────────────────────────────────
const TIER_CONFIG = {
  safe: {
    badge: 'Positive Outlook',
    badgeClass: 'bg-sage-50 text-sage-700 border-sage-200',
    scoreColor: 'text-sage-600',
    heroBg: 'bg-sage-50/60',
    accent: 'border-l-sage-500',
    encouragement: [
      'You showed up for yourself today.',
      "Your responses indicate a stable emotional baseline. That doesn't mean everything is perfect — it means your coping resources are working.",
      'Keep this momentum. Small, consistent habits compound into lasting resilience.',
    ],
  },
  elevated: {
    badge: 'Needs Attention',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    scoreColor: 'text-amber-600',
    heroBg: 'bg-amber-50/50',
    accent: 'border-l-amber-400',
    encouragement: [
      'It takes courage to be honest with yourself.',
      "Your score suggests you've been carrying some weight lately. These feelings are real, they're valid, and they're also addressable with the right support.",
      "The recommendations below are a practical starting point. You don't have to do everything at once.",
    ],
  },
  crisis: {
    badge: 'Immediate Support',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    scoreColor: 'text-rose-600',
    heroBg: 'bg-white',
    accent: 'border-l-rose-400',
    encouragement: [
      'You are not alone in this.',
      "What you're feeling right now is serious, and it deserves serious, compassionate care — not tomorrow, today.",
      'The resources below are here for exactly this moment. Please reach out.',
    ],
  },
};

interface ResultsPageProps {
  latestResult: AssessmentRecord | null;
  onRetake: () => void;
  onNavigateHome: () => void;
}

export function ResultsPage({ latestResult, onRetake, onNavigateHome }: ResultsPageProps) {
  const [result, setResult] = useState<AssessmentRecord | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trend, setTrend] = useState<{ trend: string; delta: number | null; message: string } | null>(null);
  const [milestones, setMilestones] = useState<{ id: string; message: string }[] | null>(null);

  useEffect(() => {
    const rawResultString = sessionStorage.getItem('phq9_result');
    if (!rawResultString) {
      if (latestResult) {
        setResult(latestResult);
        setRecommendations(fetchClinicalRecommendations(latestResult.score));
        setIsLoading(false);
      } else {
        onRetake();
      }
      return;
    }
    try {
      const parsed = JSON.parse(rawResultString);
      const score =
        typeof parsed.score === 'number'
          ? parsed.score
          : parsed.answers?.reduce((acc: number, val: number) => acc + val, 0) ?? 0;
      const record: AssessmentRecord = {
        id: parsed.id || 'session-' + Date.now(),
        taken_at: parsed.taken_at || parsed.date || new Date().toISOString(),
        score,
        tier: parsed.tier || 'safe',
        answers: parsed.answers || [],
        summary: parsed.summary || null,
        disclaimer: parsed.disclaimer || undefined,
        crisis: parsed.crisis || null,
      };
      setResult(record);
      setRecommendations(fetchClinicalRecommendations(score));
      setTrend(parsed.trend || null);
      setMilestones(parsed.milestones || null);
      sessionStorage.removeItem('phq9_result');
    } catch (e) {
      console.error('Error parsing assessment result', e);
      if (latestResult) {
        setResult(latestResult);
        setRecommendations(fetchClinicalRecommendations(latestResult.score));
      } else {
        onRetake();
      }
    } finally {
      setIsLoading(false);
    }
  }, [latestResult, onRetake]);

  // ── Loading state ──────────────────────────────────────
  if (isLoading || !result) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-7 h-7 text-sage-600 animate-spin" />
        <p className="text-sm font-semibold text-ink-muted">Loading your reflections...</p>
      </div>
    );
  }

  const tier = result.tier as keyof typeof TIER_CONFIG;
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.safe;
  const isCrisis = tier === 'crisis';
  const takenAt = new Date(result.taken_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // ── Main render ────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full"
    >
      <div className={`w-full ${config.heroBg} border-b border-ivory-200`}>
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-start">

            {/* ── LEFT col ───────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              {/* Badge + date */}
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-widest uppercase border ${config.badgeClass}`}>
                  {config.badge}
                </span>
                <span className="text-[11px] font-mono text-ink-light">{takenAt}</span>
              </div>

              {/* Score */}
              {!isCrisis && (
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-ink-muted uppercase block mb-2">
                    PHQ-9 Total Score
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className={`font-display font-black text-7xl md:text-8xl leading-none select-none ${config.scoreColor}`}>
                      {result.score}
                    </span>
                    <div className="space-y-1">
                      <span className="text-ink-light font-mono text-lg">/ 27</span>
                      <div className="w-16 bg-ivory-300 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(result.score / 27) * 100}%`, backgroundColor: 'currentColor' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Encouragement */}
              <div className={`border-l-4 pl-5 space-y-3 ${config.accent}`}>
                {config.encouragement.map((para, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 + i * 0.12 }}
                    className={
                      i === 0
                        ? 'font-display font-semibold text-xl md:text-2xl text-ink leading-snug'
                        : 'text-sm text-ink-light leading-relaxed'
                    }
                  >
                    {para}
                  </motion.p>
                ))}
              </div>

              {/* Recommendations */}
              {!isCrisis && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-ink-muted uppercase">
                      Clinical Recommendations
                    </span>
                    <h3 className="font-display font-bold text-xl text-ink mt-1">
                      Practical next steps
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {recommendations.map((rec, i) => (
                      <motion.div
                        key={rec.title}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.25 + i * 0.08 }}
                        className="bg-white border border-ivory-200 rounded-2xl p-5 shadow-warm-xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-display font-semibold text-base text-ink leading-snug">
                            {rec.title}
                          </h4>
                          <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider bg-ivory-100 text-ink-muted border border-ivory-300 uppercase">
                            {rec.category}
                          </span>
                        </div>
                        <p className="text-sm text-ink-light leading-relaxed">{rec.description}</p>
                        <div className="flex items-start gap-2 pt-1 border-t border-ivory-100">
                          <ArrowRight className="w-3.5 h-3.5 text-sage-500 mt-0.5 shrink-0" />
                          <p className="text-xs text-sage-700 font-medium leading-relaxed">
                            {rec.actionableStep}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Premium coping task */}
              {!isCrisis && (
                <PremiumGate featureName="Coping task selection" compact={false}>
                  <div className="bg-white border border-ivory-200 rounded-3xl p-6 shadow-warm-xs space-y-2">
                    <h3 className="font-display font-bold text-lg text-ink-soft">
                      Choose a focus until your next check-in
                    </h3>
                    <p className="text-sm text-ink-muted leading-relaxed">
                      Select a coping technique to focus on until your next check-in.
                    </p>
                  </div>
                </PremiumGate>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                {isCrisis ? (
                  <Button
                    variant="primary"
                    onClick={onNavigateHome}
                    className="gap-2 bg-sage-600 hover:bg-sage-700 text-white text-sm rounded-xl px-6 py-3"
                  >
                    <Home className="w-4 h-4" /> Return home
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      onClick={() => {
                        sessionStorage.setItem(
                          'maedot_booking_context',
                          JSON.stringify({ score: result.score, tier: result.tier })
                        );
                        window.history.pushState({}, '', '/book');
                        window.dispatchEvent(new Event('navigationchange'));
                      }}
                      className="gap-2 bg-sage-600 hover:bg-sage-700 text-white text-sm rounded-xl px-6 py-3"
                    >
                      <Calendar className="w-4 h-4" /> Book appointment
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={onRetake}
                      className="gap-2 text-sm rounded-xl px-5 py-3 border-ink/20"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retake
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={onNavigateHome}
                      className="gap-2 text-sm rounded-xl px-5 py-3 border-ink/20"
                    >
                      <Home className="w-3.5 h-3.5" /> Home
                    </Button>
                  </>
                )}
              </div>
            </motion.div>

            {/* ── RIGHT col ──────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="md:sticky md:top-20"
            >
              <div className="bg-white border border-ivory-200 rounded-3xl p-6 md:p-8 shadow-warm-md">
                {tier === 'crisis' ? (
                  <CrisisResult result={result} recommendations={recommendations} />
                ) : tier === 'elevated' ? (
                  <ElevatedResult
                    result={result}
                    recommendations={recommendations}
                    trend={trend}
                    milestones={milestones}
                  />
                ) : (
                  <SafeResult
                    result={result}
                    recommendations={recommendations}
                    trend={trend}
                    milestones={milestones}
                  />
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default ResultsPage;