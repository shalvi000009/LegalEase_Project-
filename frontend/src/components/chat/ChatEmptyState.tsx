import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ShieldCheck, Zap, ArrowRight } from 'lucide-react';

interface ChatEmptyStateProps {
  onSelectQuestion: (question: string) => void;
}

export const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ onSelectQuestion }) => {
  const starterPrompts = [
    {
      title: 'Termination Rules',
      desc: 'How quickly can either party exit this contract?',
      prompt: 'What are the termination notice requirements and penalties in this agreement?',
    },
    {
      title: 'Liability Limits',
      desc: 'Check if damages are capped or unlimited.',
      prompt: 'What is the maximum liability cap and are there any excluded claims?',
    },
    {
      title: 'Indemnity & Risk',
      desc: 'Identify third-party legal indemnification risks.',
      prompt: 'Summarize the indemnification terms and specify who holds indemnification obligations.',
    },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
          <ShieldCheck className="w-3 h-3" />
        </div>
      </motion.div>

      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Ask anything about your contract
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
          Powered by RAG AI assistant. Get instant answers backed by direct citations and clause references.
        </p>
      </div>

      <div className="w-full space-y-2 text-left">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
          Popular Questions:
        </span>
        {starterPrompts.map((item, idx) => (
          <motion.button
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.2 }}
            onClick={() => onSelectQuestion(item.prompt)}
            className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition-all text-left group flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>{item.title}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};
