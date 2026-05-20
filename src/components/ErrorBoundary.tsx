"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="glass-panel p-8 rounded-3xl border border-red-500/30 text-center max-w-lg mx-auto my-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] bg-slate-950/80">
          <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-5 border border-red-500/40">
            <AlertTriangle className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">System Error Caught</h2>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            {this.state.error?.message || "An unexpected error occurred in the camera component. This may be due to hardware access permissions or temporary driver constraints."}
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/40 rounded-xl font-bold hover:bg-red-500/30 transition-all flex items-center gap-2 mx-auto active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" /> Restart Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
