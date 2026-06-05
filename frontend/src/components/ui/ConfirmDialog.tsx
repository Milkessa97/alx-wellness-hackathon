import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  loading?: boolean;
  icon?: React.ReactNode;
}

/**
 * A calming confirmation dialog built on Modal. Used for destructive or
 * irreversible actions (e.g. deleting check-in history).
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const isDanger = tone === 'danger';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" dismissible={!loading} ariaLabel={title}>
      <div className="p-6 text-center space-y-5">
        <div
          className={clsx(
            'mx-auto w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border',
            isDanger
              ? 'bg-rose-50 text-rose-600 border-rose-100'
              : 'bg-sage-50 text-sage-600 border-sage-200'
          )}
        >
          {icon ?? <AlertTriangle className="w-6 h-6" />}
        </div>

        <div className="space-y-1.5 select-none">
          <h4 className="font-display font-bold text-lg text-ink-soft">{title}</h4>
          {description && (
            <p className="text-xs text-ink-muted leading-relaxed font-body">{description}</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="w-1/2 text-xs font-bold text-ink-muted hover:text-ink hover:bg-ivory-100 border border-ivory-200 rounded-xl py-3 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={clsx(
              'w-1/2 text-xs font-bold text-white rounded-xl py-3 shadow-md transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center',
              isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sage-600 hover:bg-sage-700'
            )}
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
