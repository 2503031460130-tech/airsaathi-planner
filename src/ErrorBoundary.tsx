import React, { Component, type ErrorInfo, type ReactNode } from "react";

export type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Enterprise-grade ErrorBoundary providing graceful UI fallbacks
 * and preventing catastrophic white-screen crashes on client exceptions.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  override state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (typeof console !== "undefined" && console.error) {
      console.error(
        "AirSaathi ErrorBoundary caught an exception:",
        error,
        errorInfo,
      );
    }
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          style={{
            padding: "32px",
            fontFamily: "system-ui, sans-serif",
            color: "#122f2d",
          }}
        >
          <h2>Something went wrong / कुछ गलत हो गया</h2>
          <p>
            Please refresh the application. Any entered routines stay private.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 18px",
              cursor: "pointer",
              borderRadius: "6px",
              border: "1px solid #ccc",
              background: "#122f2d",
              color: "#fff",
            }}
          >
            Reload / पुनः लोड करें
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
