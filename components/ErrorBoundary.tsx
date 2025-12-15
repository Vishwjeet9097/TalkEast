import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, errorInfo }: { error: Error | null; errorInfo: ErrorInfo | null }) {
  const [showDetails, setShowDetails] = React.useState(false);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/#/dashboard';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-2xl w-full glass-panel rounded-3xl p-8 md:p-12 shadow-2xl border border-white/60 dark:border-slate-700 relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 text-center">
          {/* Error Icon */}
          <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-500/30 animate-bounce">
            <AlertTriangle size={48} className="text-white" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
            Oops! Something Went Wrong
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-8 text-lg">
            We encountered an unexpected error. Don't worry, your data is safe.
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Bug size={18} className="text-red-600 dark:text-red-400" />
                <span className="font-bold text-red-800 dark:text-red-300">Error Details</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-400 font-mono break-all">
                {error.message || 'Unknown error occurred'}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <button
              onClick={handleReload}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Reload App
            </button>
            <button
              onClick={handleGoHome}
              className="flex-1 px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition-all flex items-center justify-center gap-2"
            >
              <Home size={20} />
              Go to Dashboard
            </button>
          </div>

          {/* Technical Details Toggle */}
          {errorInfo && (
            <div className="mt-6">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </button>
              {showDetails && (
                <div className="mt-4 bg-slate-900 dark:bg-black rounded-xl p-4 text-left overflow-auto max-h-64">
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                    {error?.stack}
                    {'\n\n'}
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// HOC wrapper to use hooks
export default function ErrorBoundary(props: Props) {
  return <ErrorBoundaryClass {...props} />;
}

