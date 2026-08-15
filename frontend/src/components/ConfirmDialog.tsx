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
    <div className="fixed top-5 right-5 z-[1000] w-[340px] max-w-[calc(100vw-2rem)]">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/40 overflow-hidden animate-toast-in">
        <div className="flex items-start gap-3 px-5 pt-5">
          <div className="w-10 h-10 shrink-0 rounded-full bg-error-container flex items-center justify-center">
            <span className="material-symbols-outlined text-error text-xl">{icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-label-md text-label-md font-bold text-on-surface leading-tight">{title}</h2>
            <p className="font-caption text-caption text-on-surface-variant mt-1">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation"
            className="shrink-0 -m-1 p-1 text-on-surface-variant hover:text-on-surface rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="flex gap-2.5 px-5 pb-5 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg bg-surface-container-high text-on-surface font-bold transition-all hover:bg-surface-container-highest active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-error text-on-error font-bold shadow-lg transition-all hover:bg-error/90 active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
