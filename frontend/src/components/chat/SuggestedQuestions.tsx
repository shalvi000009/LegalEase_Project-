import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Sparkles } from 'lucide-react';

interface SuggestedQuestionsProps {
  questions?: string[];
  onSelect: (question: string) => void;
}

const DEFAULT_QUESTIONS = [
  'What are the termination notice terms?',
  'Is liability capped or un-capped?',
  'What are the key indemnification obligations?',
  'Are there any automatic renewal clauses?',
];

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  questions = DEFAULT_QUESTIONS,
  onSelect,
}) => {
  const list = questions.length > 0 ? questions : DEFAULT_QUESTIONS;

  return (
    <div className="py-2 px-3 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        <span>Suggested Contract Questions:</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {list.map((question, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
            onClick={() => onSelect(question)}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-all text-slate-700 dark:text-slate-200 shadow-sm group"
          >
            <HelpCircle className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <span className="whitespace-nowrap">{question}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
