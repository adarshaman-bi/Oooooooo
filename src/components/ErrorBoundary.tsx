import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[Antigravity Mode] UI Component Crash Intercepted by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-zinc-950/60 border border-red-900/20 rounded-3xl flex flex-col items-center justify-center text-center gap-4 max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-500/30 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Component Loading Interrupted
            </h3>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed max-w-sm">
              We've gracefully halted this component to prevent a full page collapse. The error was recorded and isolated.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-black/60 rounded-xl text-[10px] font-mono text-red-400/80 text-left overflow-x-auto max-w-xs sm:max-w-sm select-all">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="px-5 py-2 bg-white text-black font-bold text-xs rounded-full flex items-center gap-2 hover:bg-zinc-200 transition active:scale-95 cursor-pointer shadow"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
