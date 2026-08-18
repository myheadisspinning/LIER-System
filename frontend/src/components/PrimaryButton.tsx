import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export default function PrimaryButton({
  children,
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold tracking-wide py-3 px-6 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
