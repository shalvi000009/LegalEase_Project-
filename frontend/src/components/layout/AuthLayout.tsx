import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, FileText, Sparkles } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const features = [
  {
    icon: <ShieldCheck className="w-5 h-5 text-indigo-400" />,
    title: 'Automated Risk Scoring',
    description: 'Instant 0-100 risk analysis with color-coded liability flags.',
  },
  {
    icon: <Zap className="w-5 h-5 text-amber-400" />,
    title: 'AI Contract Assistant',
    description: 'Chat directly with legal-BERT and GPT models about any clause.',
  },
  {
    icon: <FileText className="w-5 h-5 text-emerald-400" />,
    title: 'Smart Reminders',
    description: 'Auto-track renewal dates and sync with Gmail and Google Drive.',
  },
];

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden">
      {/* Decorative Animated Floating Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/20 dark:bg-indigo-600/20 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-500/20 dark:bg-purple-600/20 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />

      {/* Left Brand Showcase Section (lg screens) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white relative z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div>
          <Logo size="lg" className="text-white" />
        </div>

        <div className="max-w-md my-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Legal Intelligence</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Analyze Contracts in Seconds with <span className="bg-gradient-to-r from-indigo-400 to-purple-300 bg-clip-text text-transparent">AI Precision</span>
            </h1>
            <p className="text-slate-300 text-base leading-relaxed">
              Empower your legal operations with automated risk evaluation, clause extraction, and intelligent contract monitoring.
            </p>
          </motion.div>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
                className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{feature.title}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} LegalEase Inc. All rights reserved.</span>
          <span>v1.0.0</span>
        </div>
      </div>

      {/* Right Form Container Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 z-10 relative">
        <div className="flex items-center justify-between w-full max-w-md mx-auto">
          <Logo className="lg:hidden" />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <main className="w-full max-w-md mx-auto my-auto py-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {subtitle}
            </p>
          </motion.div>

          {children}
        </main>

        <footer className="w-full max-w-md mx-auto text-center text-xs text-slate-400 dark:text-slate-600">
          Protected by enterprise-grade 256-bit SSL encryption.
        </footer>
      </div>
    </div>
  );
};
