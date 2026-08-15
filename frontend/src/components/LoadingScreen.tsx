interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Please wait...' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="w-14 h-14 rounded-full border-4 border-secondary border-t-transparent animate-spin" />
      <p className="mt-5 font-body-md text-body-md text-on-surface-variant">{message}</p>
    </div>
  );
}
