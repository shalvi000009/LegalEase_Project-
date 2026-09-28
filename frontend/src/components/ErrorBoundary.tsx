import { Component, ErrorInfo, ReactNode } from 'react';
import { Frown, RefreshCw, Home, Mail, ChevronDown, Bug } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[UNCAUGHT ERROR]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'Unknown application runtime exception.';
      const mailtoUrl = `mailto:support@legalease.ai?subject=LegalEase%20Error%20Report&body=${encodeURIComponent(
        `Error: ${errorMsg}\n\nStack:\n${this.state.error?.stack || 'N/A'}`
      )}`;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-lg w-full text-center space-y-6 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-md"
          >
            {/* Sad Face / Frown Illustration */}
            <div className="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-950/70 text-red-500 dark:text-red-400 flex items-center justify-center mx-auto shadow-inner ring-8 ring-red-50/50 dark:ring-red-950/30">
              <Frown className="w-10 h-10 animate-bounce" />
            </div>

            {/* Error Message Header */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Something went wrong
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                LegalEase encountered an unexpected glitch. Don’t worry, your documents remain safe in the vault.
              </p>
            </div>

            {/* Collapsible Error Details */}
            {this.state.error && (
              <div className="text-left border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950/60">
                <button
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Bug className="w-3.5 h-3.5 text-amber-500" />
                    Error Details (Technical Log)
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      this.state.showDetails ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {this.state.showDetails && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-[11px] font-mono text-red-600 dark:text-red-400 space-y-2 overflow-x-auto max-h-48">
                    <p className="font-semibold">{this.state.error.toString()}</p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-[10px] text-slate-500 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                fullWidth
                variant="primary"
                onClick={this.handleReload}
                iconLeft={<RefreshCw className="w-4 h-4" />}
              >
                Reload Page
              </Button>
              <Button
                fullWidth
                variant="secondary"
                onClick={this.handleGoHome}
                iconLeft={<Home className="w-4 h-4" />}
              >
                Go Home
              </Button>
            </div>

            {/* Mailto Report Issue Link */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <a
                href={mailtoUrl}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                <Mail className="w-3.5 h-3.5" />
                Report issue to engineering team
              </a>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
