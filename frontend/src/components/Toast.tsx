import { useEffect } from 'react';

export type ToastType = 'success' | 'error';

export interface ToastData {
  type: ToastType;
  message: string;
}

interface ToastProps {
  type: ToastType;
  message: string;
  onClose: () => void;
}

export default function Toast({ type, message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-5 right-5 z-[150] flex items-start gap-3 rounded-lg shadow-2xl px-5 py-4 w-[320px] max-w-[calc(100vw-2rem)] animate-toast-in ${
        type === 'success' ? 'bg-secondary text-white' : 'bg-error text-white'
      }`}
      role="alert"
    >
      <span className="material-symbols-outlined text-xl shrink-0">
        {type === 'success' ? 'check_circle' : 'error'}
      </span>
      <div className="min-w-0">
        <p className="font-label-md text-label-md font-bold mb-0.5">
          {type === 'success' ? 'Success' : 'Error'}
        </p>
        <p className="text-caption text-white/90 break-words">{message}</p>
      </div>
      <button
        className="ml-auto shrink-0 text-white/70 hover:text-white transition-colors"
        type="button"
        onClick={onClose}
        aria-label="Close notification"
      >
        <span className="material-symbols-outlined text-lg">close</span>
      </button>
    </div>
  );
}
