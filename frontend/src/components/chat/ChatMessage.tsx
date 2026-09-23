import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Bookmark } from 'lucide-react';
import { Message } from '../../types/chat';

interface ChatMessageProps {
  message: Message;
  onCitationClick?: (clauseId: string, page?: number) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onCitationClick }) => {
  const isUser = message.role === 'user';

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Render markdown-like basic formatting (bold, lists, code inline)
  const renderFormattedContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bold text formatting **text**
      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
      const lineContent = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-indigo-900 dark:text-indigo-200">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={pIdx} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-xs font-mono text-indigo-600 dark:text-indigo-400">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });

      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc my-0.5">
            {lineContent}
          </li>
        );
      }

      return (
        <p key={idx} className={idx > 0 ? 'mt-2' : ''}>
          {lineContent}
        </p>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: isUser ? 16 : -16, y: 8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`flex gap-3 items-start my-3 ${isUser ? 'flex-row-reverse text-right' : 'text-left'}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
          isUser
            ? 'bg-indigo-600 text-white font-semibold text-xs'
            : 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content Bubble */}
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed border ${
            isUser
              ? 'bg-indigo-600 text-white border-indigo-700 rounded-tr-sm'
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 rounded-tl-sm'
          }`}
        >
          <div className="font-sans whitespace-pre-wrap">{renderFormattedContent(message.content)}</div>

          {/* Citations Badges */}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-700/60 flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-400 self-center uppercase font-medium tracking-wider">Citations:</span>
              {message.citations.map((citation, cIdx) => (
                <button
                  key={cIdx}
                  onClick={() => onCitationClick?.(citation.clauseId, citation.page)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                >
                  <Bookmark className="w-3 h-3" />
                  <span>Clause #{citation.clauseId}</span>
                  {citation.page && <span className="text-[10px] text-indigo-400">(p. {citation.page})</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
};
