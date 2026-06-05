import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { CheckCircle, AlertCircle, Info, Trophy } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'milestone';

export interface ToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  /** Auto-dismiss after this many ms. Default 4000. */
  duration?: number;
}

interface ToastItem extends Required<Omit<ToastOptions, 'title'>> {
  id: number;
  title?: string;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      window.clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ message, title, type = 'info', duration = 4000 }: ToastOptions) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, title, type, duration }]);
      const handle = window.setTimeout(() => dismiss(id), duration);
      timers.current.set(id, handle);
      return id;
    },
    [dismiss]
  );

  // Clean up any pending timers on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((h) => window.clearTimeout(h));
      map.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Graceful no-op fallback if used outside the provider.
    return { toast: () => -1, dismiss: () => {} };
  }
  return ctx;
}

// ── Presentation ──────────────────────────────────────────────────────────

const typeStyles: Record<ToastType, { icon: React.ReactNode; chip: string; label: string }> = {
  success: {
    icon: <CheckCircle className="w-4 h-4" />,
    chip: 'bg-sage-50 text-sage-600 border border-sage-200',
    label: 'Done',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    chip: 'bg-rose-50 text-rose-600 border border-rose-200',
    label: 'Something went wrong',
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    chip: 'bg-ivory-100 text-ink-muted border border-ivory-200',
    label: 'Heads up',
  },
  milestone: {
    icon: <Trophy className="w-4 h-4" />,
    chip: 'bg-sage-50 text-sage-600 border border-sage-200',
    label: 'Milestone unlocked',
  },
};

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed bottom-6 right-6 z-[120] flex flex-col items-end gap-3 max-w-[calc(100vw-3rem)] pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          if (t.type === 'milestone') {
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="pointer-events-auto w-80 max-w-full flex items-center gap-3.5 px-5 py-4 bg-sage-600 text-white rounded-2xl shadow-warm-lg border border-sage-500/20 font-body"
                onClick={() => onDismiss(t.id)}
              >
                <div className="p-2 bg-sage-500 rounded-xl text-amber-300 shrink-0 shadow-inner">
                  <Trophy className="w-5 h-5 fill-amber-400" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[9px] font-bold text-amber-200 uppercase tracking-widest font-mono">
                    {t.title ?? 'Milestone unlocked'}
                  </span>
                  <p className="text-xs md:text-sm font-semibold text-white leading-relaxed">{t.message}</p>
                </div>
              </motion.div>
            );
          }
          const s = typeStyles[t.type];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="pointer-events-auto w-80 max-w-full rounded-2xl p-4 shadow-warm-lg border border-ivory-200 bg-white flex items-start gap-3"
              onClick={() => onDismiss(t.id)}
            >
              <div className={clsx('p-1.5 rounded-xl shrink-0', s.chip)}>{s.icon}</div>
              <div className="text-xs text-ink-soft text-left pr-1">
                <p className="font-bold leading-tight">{t.title ?? s.label}</p>
                <p className="text-ink-muted mt-0.5 leading-relaxed font-body">{t.message}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}

export default ToastProvider;
