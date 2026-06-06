import { motion } from 'motion/react';
import { AssessmentRecord, Recommendation, CrisisResource } from '../../types';
import { Heart, Globe } from 'lucide-react';
import Button from '../ui/Button';
import { DEFAULT_CRISIS_RESOURCES } from '../../lib/crisisResources';

interface CrisisResultProps {
  result: AssessmentRecord;
  recommendations?: Recommendation[];
}

export function CrisisResult({ result, recommendations }: CrisisResultProps) {
  // Use resources from the response if populated, else use the standard default guidelines
  const displayResources = result.crisis?.resources || DEFAULT_CRISIS_RESOURCES;
  const displayDisclaimer = result.crisis?.disclaimer || "Disclaimer: This screening tool does not replace a physical psychiatric investigation or diagnostic medical visit. If you recognize acute discomfort, anxiety, or ideas of physical harm, please involve accredited clinical experts.";

  const containerVariants = {
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="w-full bg-white text-left font-body space-y-8 select-none">
      
      {/* HEADER SECTION - Warm and Supportive Tone */}
      <div className="text-center py-4 space-y-3">
        {/* Rose-400 Heart Icon (Not alarm or emergency siren) */}
        <div className="flex justify-center">
          <Heart className="w-12 h-12 text-rose-450 fill-rose-100" />
        </div>
        
        <h3 className="font-display font-bold text-2xl md:text-3xl text-ink leading-tight">
          You don't have to carry this alone.
        </h3>
        <p className="text-sm md:text-base text-ink-light max-w-md mx-auto leading-relaxed">
          Based on your responses, we want to make sure you have support right now.
        </p>
      </div>

      {/* RESOURCES SECTION */}
      <div className="space-y-4">
        <h4 className="text-xs md:text-sm font-mono font-bold uppercase tracking-wider text-ink-muted">
          Reach out — right now, for free
        </h4>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-4"
        >
          {displayResources.map((res: CrisisResource, idx: number) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              className="p-5 md:p-6 bg-white border border-rose-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all shadow-sm"
              style={{ contentVisibility: 'auto' }}
            >
              <div className="space-y-1 text-left">
                <h5 className="font-body font-bold text-ink text-sm md:text-base">
                  {res.name}
                </h5>
                <p className="text-xs md:text-sm text-ink-muted leading-relaxed max-w-lg">
                  {res.detail}
                </p>
              </div>
              
              <div className="shrink-0 self-start md:self-center">
                <a 
                  href={res.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="no-underline inline-block w-full md:w-auto"
                >
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full md:w-auto px-4 py-2 flex items-center justify-center gap-1.5 font-sans font-semibold rounded-xl text-xs bg-sage-500 hover:bg-sage-600 text-white border-transparent"
                  >
                    <Globe className="w-3.5 h-3.5" /> Contact now →
                  </Button>
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* BOTTOM MESSAGE SECTION */}
      <div className="w-full bg-rose-50 rounded-2xl p-6 text-center space-y-4 border border-rose-100/60">
        <p className="text-xs md:text-sm text-ink-light leading-relaxed max-w-xl mx-auto">
          {displayDisclaimer}
        </p>
        
        <div className="my-2 border-t border-rose-100/50" />
        
        <p className="font-sans font-bold text-sm md:text-base text-ink tracking-tight">
          If you are in immediate danger, please call your local emergency services (like 911 or 999).
        </p>
      </div>
    </div>
  );
}

export default CrisisResult;
