import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Width of the panel. */
  size?: ModalSize;
  /** When false, Esc/backdrop clicks and the close button are disabled. */
  dismissible?: boolean;
  /** Show the small × button in the corner. */
  showCloseButton?: boolean;
  ariaLabel?: string;
  labelledBy?: string;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

/**
 * Reusable, calming modal overlay. Renders to a portal on document.body so it
 * escapes any `overflow-hidden` card contexts. Handles Esc-to-close, backdrop
 * click, body scroll-lock, and focus management.
 */
export function Modal({
  isOpen,
  onClose,
  children,
  size = 'sm',
  dismissible = true,
  showCloseButton = false,
  ariaLabel,
  labelledBy,
  className,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Esc to close
  useEffect(() => {
    if (!isOpen || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, dismissible, onClose]);

  // Body scroll-lock while open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Focus the panel on open; restore focus on close
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      // Defer so the element exists after the enter animation mounts.
      const id = window.setTimeout(() => panelRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    previouslyFocused.current?.focus?.();
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-ink"
            onClick={() => dismissible && onClose()}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={labelledBy}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className={clsx(
              'relative w-full bg-white border border-ivory-200 rounded-3xl shadow-warm-lg focus:outline-none',
              sizeClasses[size],
              className
            )}
          >
            {showCloseButton && dismissible && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-4 right-4 z-10 text-ink-light hover:text-ink p-1.5 rounded-lg hover:bg-ivory-100 transition-colors cursor-pointer focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default Modal;
