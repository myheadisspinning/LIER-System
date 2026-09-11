import Ph from './PhIcon';
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
      className={`fixed top-3 right-3 z-[150] flex items-start gap-2 sm:gap-3 rounded-lg shadow-2xl px-3 py-3 sm:px-5 sm:py-4 w-[260px] sm:w-[320px] max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)] animate-toast-in ${
        type === 'success' ? 'bg-secondary text-white' : 'bg-error text-white'
      }`}
      role="alert"
    >
      <Ph className="text-lg sm:text-xl shrink-0" name={type === 'success' ? 'check_circle' : 'error'} />
      <div className="min-w-0">
        <p className="font-label-sm sm:font-label-md text-label-sm sm:text-label-md font-bold mb-0.5">
          {type === 'success' ? 'Success' : 'Error'}
        </p>
        <p className="text-[11px] sm:text-caption text-white/90 break-words leading-snug">{message}</p>
      </div>
      <button
        className="ml-auto shrink-0 text-white/70 hover:text-white transition-colors"
        type="button"
        onClick={onClose}
        aria-label="Close notification"
      >
        <Ph className="text-lg" name="close" />
      </button>
    </div>
  );
}
