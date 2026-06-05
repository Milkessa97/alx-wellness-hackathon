import { ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import SignInButton from './SignInButton';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

/**
 * A focused sign-in dialog. Hosts the existing SignInButton (which renders the
 * real Google Identity Services button) — no auth logic lives here.
 */
export function SignInModal({
  isOpen,
  onClose,
  title = 'Sign in to save your progress',
  description = 'We use your account to keep your check-ins private and track how you feel over time.',
}: SignInModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton ariaLabel="Sign in">
      <div className="p-7 text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-sage-50 text-sage-600 border border-sage-200/50 flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <div className="space-y-2 select-none">
          <h2 className="font-display font-extrabold text-xl text-ink tracking-tight leading-snug">
            {title}
          </h2>
          <p className="text-sm text-ink-muted leading-relaxed font-body max-w-xs mx-auto">
            {description}
          </p>
        </div>

        <div className="pt-1 flex justify-center">
          <SignInButton />
        </div>

        <p className="text-[11px] text-ink-light leading-relaxed font-body">
          Private by design — your reflections stay yours.
        </p>
      </div>
    </Modal>
  );
}

export default SignInModal;
