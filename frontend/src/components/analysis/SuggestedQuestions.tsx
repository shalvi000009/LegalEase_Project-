import React from 'react';
import { Lightbulb, ArrowRight, MessageSquare } from 'lucide-react';

export interface SuggestedQuestionsProps {
  questions: string[];
  onSelectQuestion?: (question: string) => void;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
  questions,
  onSelectQuestion,
}) => {
  if (!questions || questions.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-900/90 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl space-y-4 relative overflow-hidden">
      {/* Glow Effect Background */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
        <Lightbulb className="w-4 h-4 text-amber-400 animate-pulse" /> AI Suggested Legal Questions
      </div>

      <p className="text-xs text-indigo-200">
        Click any question to ask LegalEase AI Assistant directly:
      </p>

      {/* Questions Buttons List */}
      <div className="space-y-2">
        {questions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectQuestion && onSelectQuestion(q)}
            className="w-full text-left p-3.5 rounded-2xl bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 hover:border-indigo-600/80 text-xs text-indigo-100 transition-all flex items-center justify-between gap-3 group focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 flex-shrink-0" />
              <span>"{q}"</span>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
};
