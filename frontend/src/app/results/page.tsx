import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AssessmentRecord, Recommendation } from '../../types';
import SafeResult from '../../components/results/SafeResult';
import ElevatedResult from '../../components/results/ElevatedResult';
import CrisisResult from '../../components/results/CrisisResult';
import Button from '../../components/ui/Button';
import { PremiumGate } from '../../components/ui/PremiumGate';
import { RefreshCw, Home } from 'lucide-react';

export function fetchClinicalRecommendations(score: number): Recommendation[] {
  if (score >= 20) {
    return [
      {
        title: "Immediate Crisis Support Network",
        category: "Urgent",
        description: "Your score reflects severe symptoms. Please connect with professional support immediately.",
        actionableStep: "Reach out to the 988 Lifeline by calling or texting 988."
      },
      {
        title: "Schedule Professional Evaluation",
        category: "Medical",
        description: "A licensed healthcare provider is essential for diagnostic evaluation, therapy, and consultation.",
        actionableStep: "Contact a psychiatrist, psychologist, or primary care doctor today."
      }
    ];
  } else if (score >= 10) {
    return [
      {
        title: "Cognitive Behavioral Therapy (CBT)",
        category: "Therapy",
        description: "CBT is highly effective for moderate symptoms, focusing on restructuring unhelpful thoughts.",
        actionableStep: "Search directories like Psychology Today for CBT certified therapists."
      },
      {
        title: "Behavioral Activation Plans",
        category: "Self-Care",
        description: "Intentionally scheduling rewarding or peaceful activities can boost mood patterns.",
        actionableStep: "Select one minor activity (e.g., a 15-minute walk) and schedule it for tomorrow."
      }
    ];
  } else {
    return [
      {
        title: "Mindfulness and Grounding",
        category: "Prevention",
        description: "Establishing daily deep-breathing routines helps build psychological resilience.",
        actionableStep: "Practice deep breathing for 3 minutes during transition times."
      },
      {
        title: "Sleep Hygiene Optimization",
        category: "Lifestyle",
        description: "Consistent sleep schedules guard against low energy and negative ruminating habits.",
        actionableStep: "Establish a screen-free winding-down routine 1 hour before bedtime."
      }
    ];
  }
}

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
    // 1. Read response from sessionStorage key 'phq9_result'
    const rawResultString = sessionStorage.getItem('phq9_result');
    
    if (!rawResultString) {
      // Fallback to latestResult prop if sessionStorage key is missing (for robust state transitions)
      if (latestResult) {
        setResult(latestResult);
        setRecommendations(fetchClinicalRecommendations(latestResult.score));
        setTrend(null);
        setMilestones(null);
        setIsLoading(false);
      } else {
        // If entirely missing: redirect to /assessment
        onRetake();
      }
      return;
    }

    try {
      // 2. Parse and determine tier
      const parsed = JSON.parse(rawResultString);
      const score = typeof parsed.score === 'number' ? parsed.score : (parsed.answers ? parsed.answers.reduce((acc: number, val: number) => acc + val, 0) : 0);
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

      // 3. Clear sessionStorage after reading (one-time display)
      sessionStorage.removeItem('phq9_result');
    } catch (e) {
      console.error('Error parsing assessment result', e);
      if (latestResult) {
        setResult(latestResult);
        setRecommendations(fetchClinicalRecommendations(latestResult.score));
        setTrend(null);
        setMilestones(null);
      } else {
        onRetake();
      }
    } finally {
      setIsLoading(false);
    }
  }, [latestResult, onRetake]);

  if (isLoading || !result) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-sage-600 animate-spin" />
        <p className="text-sm font-semibold text-ink-muted">Loading your reflections...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`max-w-2xl mx-auto py-8 md:py-16 px-6 font-body text-center space-y-10 ${result.tier === 'crisis' ? 'bg-white rounded-3xl p-6 md:p-10 border border-ivory-200 shadow-warm-md' : ''}`}
    >
      {/* 4% Noise Grain Texture Overlay - ONLY if not crisis */}
      {result.tier !== 'crisis' && (
        <div 
          className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            opacity: 0.04,
          }}
          aria-hidden="true"
        />
      )}

      {/* Dynamic Upper Header Outcome State */}
      {result.tier !== 'crisis' && (
        <div className="space-y-3">
          <span className="px-3.5 py-1 bg-sage-50 text-sage-600 font-mono text-[10px] md:text-sm font-bold rounded-full tracking-wider uppercase border border-sage-200/50">
            Reflective Outcome
          </span>
          <h2 className="font-display font-black text-3xl md:text-4.5xl text-ink tracking-tight leading-tight">
            Your Wellness Report
          </h2>
          <p className="text-xs md:text-sm text-ink-light max-w-md mx-auto leading-relaxed">
            These results represent private mental health insights to assist in self-reflection.
          </p>
        </div>
      )}

      <div className={result.tier === 'crisis' ? "text-left space-y-8 bg-white" : "bg-white border border-ivory-200 rounded-3xl p-6 md:p-10 shadow-warm-md text-left space-y-8"}>
        {result.tier !== 'crisis' && (
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-ink-muted uppercase block mb-1">
              Total Score Metric
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-black text-5xl md:text-6xl text-ink select-none">
                {result.score}
              </span>
              <span className="text-ink-light font-mono text-base md:text-lg">/ 27</span>
            </div>
          </div>
        )}

        {/* Dynamic Tier Results */}
        <div>
          {result.tier === 'crisis' ? (
            <CrisisResult result={result} recommendations={recommendations} />
          ) : result.tier === 'elevated' ? (
            <ElevatedResult result={result} recommendations={recommendations} trend={trend} milestones={milestones} />
          ) : (
            <SafeResult result={result} recommendations={recommendations} trend={trend} milestones={milestones} />
          )}
        </div>
      </div>

      {/* Coping task — Premium feature (not shown for crisis tier) */}
      {result.tier !== 'crisis' && (
        <div className="text-left">
          <PremiumGate featureName="Coping task selection" compact={false}>
            <div className="bg-white border border-ivory-200 rounded-3xl p-6 md:p-7 shadow-warm-xs space-y-2">
              <h3 className="font-display font-bold text-lg text-ink-soft">
                Choose a focus until your next check-in
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Select a coping technique to focus on until your next check-in.
              </p>
            </div>
          </PremiumGate>
        </div>
      )}

      {/* Button Row based on Tier specificity */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
        {result.tier === 'crisis' ? (
          <Button
            variant="primary"
            onClick={onNavigateHome}
            className="w-full sm:w-auto px-8 py-3.5 gap-2 font-semibold bg-sage-600 hover:bg-sage-700 text-white rounded-xl shadow-warm-sm transition-all text-xs md:text-sm"
          >
            <Home className="w-4 h-4" /> Return home
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => {
                sessionStorage.setItem('maedot_booking_context', JSON.stringify({
                  score: result.score,
                  tier: result.tier
                }));
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/book');
                  window.dispatchEvent(new Event('navigationchange'));
                }
              }}
              className="w-full sm:w-auto px-6 py-3 shadow-sm text-xs md:text-sm text-sage-700 border-sage-500 hover:bg-sage-50"
            >
              Book an Appointment &rarr;
            </Button>
            <Button
              variant="outline"
              onClick={onNavigateHome}
              className="w-full sm:w-auto px-6 py-3 shadow-sm text-xs md:text-sm"
            >
              Return Home
            </Button>
            <Button
              variant="primary"
              onClick={onRetake}
              className="w-full sm:w-auto px-8 py-3.5 gap-2 font-semibold bg-sage-600 hover:bg-sage-700 text-white rounded-xl shadow-warm-sm transition-all text-xs md:text-sm animate-pulse-soft"
            >
              <RefreshCw className="w-4 h-4" /> Take another assessment
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default ResultsPage;
