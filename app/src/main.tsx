import { Component, type ErrorInfo, type ReactNode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', backgroundColor: 'white', height: '100vh', overflow: 'auto' }}>
          <h1>Something went wrong.</h1>
          <p style={{ fontWeight: 'bold' }}>{this.state.error?.message}</p>
          <pre style={{ fontSize: '12px', opacity: 0.8 }}>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

import { HelmetProvider } from 'react-helmet-async'

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-900 text-white font-mono uppercase tracking-widest text-xs">Loading Playground...</div>}>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </Suspense>
  </ErrorBoundary>,
)