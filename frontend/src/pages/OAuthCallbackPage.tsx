import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useOAuthCallback } from '../hooks/useOAuthCallback';

export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { status, error, provider, retry } = useOAuthCallback();

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        navigate('/settings/integrations', { replace: true });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center relative z-10"
      >
        {/* Logo / Brand Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="p-2 rounded-xl bg-indigo-600 text-white font-black text-sm">
            LE
          </div>
          <span className="font-black tracking-tight text-lg text-white">LegalEase</span>
        </div>

        <AnimatePresence mode="wait">
          {/* State 1: Loading */}
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping" />
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                <ShieldCheck className="w-6 h-6 text-indigo-400 absolute" />
              </div>
              <h2 className="text-xl font-black tracking-tight">Connecting Your Account...</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Verifying OAuth security tokens with Google and setting up auto-scan parameters.
              </p>
            </motion.div>
          )}

          {/* State 2: Success */}
          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4 py-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">Account Connected!</h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto">
                {provider === 'google_drive' ? 'Google Drive' : 'Gmail'} has been authorized. Auto-scanning is now active.
              </p>
              <div className="pt-2 text-[11px] font-bold text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Redirecting to Integrations dashboard...</span>
              </div>
            </motion.div>
          )}

          {/* State 3: Error */}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 py-4"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black text-rose-400 tracking-tight">Connection Failed</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                {error || 'An error occurred while connecting your Google account. Please try again.'}
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={retry}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/settings/integrations')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Settings</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
