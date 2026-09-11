import Ph from './PhIcon';
import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  icon = 'logout',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef(onCancel);

  useEffect(() => {
    cancelRef.current = onCancel;
  });

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelRef.current();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed top-3 right-3 z-[1000] w-[260px] sm:w-[340px] max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)]">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 overflow-hidden animate-toast-in">
        <div className="flex items-start gap-2.5 sm:gap-3 px-3.5 pt-3.5 sm:px-5 sm:pt-5">
          <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full bg-error-container flex items-center justify-center">
            <Ph className="text-error text-lg sm:text-xl" name={icon} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-label-sm sm:font-label-md text-label-sm sm:text-label-md font-bold text-on-surface leading-tight">{title}</h2>
            <p className="font-caption text-[11px] sm:text-caption text-on-surface-variant mt-1 leading-snug">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation"
            className="shrink-0 -m-1 p-1 text-on-surface-variant hover:text-on-surface rounded-full transition-colors"
          >
            <Ph className="text-lg" name="close" />
          </button>
        </div>
        <div className="flex gap-2 sm:gap-2.5 px-3.5 pb-3.5 sm:px-5 sm:pb-5 mt-3 sm:mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 sm:py-2.5 rounded-lg bg-surface-container-high text-on-surface font-bold text-[13px] sm:text-sm transition-all hover:bg-surface-container-highest active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 sm:py-2.5 rounded-lg bg-error text-on-error font-bold text-[13px] sm:text-sm shadow-lg transition-all hover:bg-error/90 active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
