import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../utils/hooks';

export default function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-amber-950/90 border border-amber-800/50 text-amber-200 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-mono backdrop-blur-sm animate-in slide-in-from-bottom-2 duration-300"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>You are offline. Some features may be unavailable.</span>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-lg bg-amber-800/40 hover:bg-amber-800/60 transition-colors cursor-pointer"
      >
        <RefreshCw className="w-3 h-3" />
        Retry
      </button>
    </div>
  );
}
