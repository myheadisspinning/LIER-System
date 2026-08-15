interface LogoutScreenProps {
  message?: string;
}

export default function LogoutScreen({ message = 'Signing you out...' }: LogoutScreenProps) {
  return (
    <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-background/90 backdrop-blur-md animate-fade-in">
      <div className="relative flex items-center justify-center">
        <div className="absolute -inset-6 rounded-full bg-secondary/15 blur-2xl animate-pulse"></div>
        <div className="relative w-24 h-24 rounded-full border-4 border-secondary/25 border-t-secondary animate-spin"></div>
        <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden border-2 border-secondary/40 shadow-lg">
          <img src="/image/culiat-logo.png" alt="Barangay Culiat Logo" className="w-full h-full object-contain" />
        </div>
      </div>
      <p className="mt-8 font-headline-md text-headline-md text-on-surface animate-pulse">{message}</p>
    </div>
  );
}
