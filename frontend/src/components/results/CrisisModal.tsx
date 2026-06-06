import { Heart, Phone, Globe } from 'lucide-react';
import { CrisisResource } from '../../types';
import { Modal } from '../ui/Modal';
import { DEFAULT_CRISIS_RESOURCES } from '../../lib/crisisResources';

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources?: CrisisResource[];
}

/**
 * A focused, calming overlay surfacing crisis support lines. Shown alongside the
 * full inline CrisisResult so the most important help is one glance away.
 */
export function CrisisModal({ isOpen, onClose, resources }: CrisisModalProps) {
  const list = resources && resources.length > 0 ? resources : DEFAULT_CRISIS_RESOURCES;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" showCloseButton ariaLabel="Crisis support">
      <div className="p-6 md:p-7 text-center space-y-6">
        <div className="space-y-3">
          <div className="flex justify-center">
            <span className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
              <Heart className="w-7 h-7 text-rose-450 fill-rose-100" />
            </span>
          </div>
          <h3 className="font-display font-bold text-xl md:text-2xl text-ink leading-snug">
            You don't have to carry this alone.
          </h3>
          <p className="text-sm text-ink-light max-w-sm mx-auto leading-relaxed">
            Support is here for you right now — free, confidential, and any time.
          </p>
        </div>

        <div className="space-y-3 text-left">
          {list.map((res, idx) => (
            <div
              key={idx}
              className="p-4 bg-white border border-rose-100 rounded-2xl flex items-center justify-between gap-4 shadow-warm-xs"
            >
              <div className="space-y-0.5 min-w-0">
                <h5 className="font-body font-bold text-ink text-sm truncate">{res.name}</h5>
                <p className="text-[11px] text-ink-muted leading-relaxed line-clamp-2">{res.detail}</p>
              </div>
              <a
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-sans font-semibold rounded-xl text-xs px-3.5 py-2 transition-colors no-underline"
              >
                <Globe className="w-3.5 h-3.5" /> Reach out
              </a>
            </div>
          ))}
        </div>

        <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100/60 flex items-center gap-2.5 justify-center">
          <Phone className="w-4 h-4 text-rose-600 shrink-0" />
          <p className="font-sans font-bold text-xs md:text-sm text-ink">
            In immediate danger? Call your local emergency services (911 / 999).
          </p>
        </div>

        <button
          onClick={onClose}
          className="bg-sage-500 hover:bg-sage-600 text-white text-xs font-semibold rounded-xl px-4 py-2 transition-colors cursor-pointer inline-block mt-2"
        >
          Continue to my reflection
        </button>
      </div>
    </Modal>
  );
}

export default CrisisModal;
