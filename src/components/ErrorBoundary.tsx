import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message;
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string; path?: string };
      if (parsed.error) {
        readable = `${parsed.operationType ?? 'Operation'} on ${parsed.path ?? 'database'}: ${parsed.error}`;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0b0e14] p-6 text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#121722] p-6">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h2 className="text-base font-semibold text-white">Something went wrong</h2>
            </div>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed break-words">
              {this.state.message || 'An unexpected application error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#d4a843] px-4 py-2.5 text-sm font-semibold text-[#0b0e14] transition hover:bg-[#e5b95c]"
            >
              <RotateCcw className="h-4 w-4" />
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
