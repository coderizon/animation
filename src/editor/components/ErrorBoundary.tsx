import React from 'react';

interface ErrorBoundaryProps {
  fallbackLabel?: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.fallbackLabel ? ` - ${this.props.fallbackLabel}` : ''}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100%', padding: 24, color: 'var(--ae-text-secondary)', fontSize: 13, gap: 8,
        }}>
          <span style={{ fontWeight: 600, color: 'var(--ae-danger)' }}>
            {this.props.fallbackLabel ?? 'Komponente'} – Fehler aufgetreten
          </span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', maxWidth: 300, textAlign: 'center', wordBreak: 'break-word' }}>
            {this.state.error?.message}
          </span>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 8, padding: '6px 14px', backgroundColor: 'var(--ae-accent)',
              color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
            }}
          >
            Neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
