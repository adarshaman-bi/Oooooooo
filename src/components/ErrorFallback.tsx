import { ShieldAlert, RotateCcw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error?: Error | null;
  title?: string;
  message?: string;
  onRetry?: () => void;
  onHome?: () => void;
  compact?: boolean;
}

export default function ErrorFallback({
  error,
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  onHome,
  compact = false,
}: ErrorFallbackProps) {
  if (compact) {
    return (
      <div role="alert" className="flex items-center gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-300 font-medium">{title}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[10px] font-mono rounded-lg transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="p-6 bg-zinc-950/60 border border-red-900/20 rounded-3xl flex flex-col items-center justify-center text-center gap-4 max-w-lg mx-auto my-8"
    >
      <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-500">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">{title}</h3>
        <p className="text-xs text-zinc-400 font-sans leading-relaxed max-w-sm">{message}</p>
        {error && (
          <pre className="p-3 bg-black/60 rounded-xl text-[10px] font-mono text-red-400/80 text-left overflow-x-auto max-w-xs sm:max-w-sm select-all">
            {error.message}
          </pre>
        )}
      </div>
      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-5 py-2 bg-white text-black font-bold text-xs rounded-full flex items-center gap-2 hover:bg-zinc-200 transition active:scale-95 cursor-pointer shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
        {onHome && (
          <button
            onClick={onHome}
            className="px-5 py-2 bg-zinc-900 text-white font-bold text-xs rounded-full flex items-center gap-2 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </button>
        )}
      </div>
    </div>
  );
}

export function ErrorInline({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-center gap-2 px-3 py-2 bg-red-950/20 border border-red-900/30 rounded-lg text-xs text-red-400">
      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-red-300 hover:text-white underline cursor-pointer text-[10px]">
          Retry
        </button>
      )}
    </div>
  );
}
