interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export default function UnreadBadge({ count, className = 'bg-error' }: UnreadBadgeProps) {
  if (!count) return null;
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
