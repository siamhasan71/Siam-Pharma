import React from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[280px] w-full p-6 flex flex-col items-center justify-center text-center bg-[#09221f] border border-[#1a554d] rounded-2xl shadow-xl text-white my-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-inner">
            <AlertOctagon className="w-6 h-6" />
          </div>

          <h3 className="text-base font-bold text-white tracking-tight">
            {this.props.fallbackTitle || 'Something went wrong rendering this component'}
          </h3>

          <p className="text-xs text-teal-200/80 max-w-md mt-1 mb-4 leading-relaxed">
            {this.props.fallbackMessage ||
              'A temporary error prevented this view from displaying. Your database and existing medicines remain safe and intact.'}
          </p>

          {this.state.error && (
            <div className="max-w-md w-full bg-[#051715] border border-rose-900/50 rounded-xl p-3 mb-4 text-left font-mono text-[11px] text-rose-300/90 overflow-x-auto max-h-32">
              <span className="font-bold text-rose-400 block mb-1">Error Trace:</span>
              {this.state.error.message || String(this.state.error)}
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#0e3b37] hover:bg-[#18534d] border border-[#236a64] text-teal-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
