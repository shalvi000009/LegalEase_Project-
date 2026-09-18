import React from 'react';
import { Bot, Square } from 'lucide-react';
import { Button } from '../ui/Button';

interface StreamingMessageProps {
  content: string;
  onCancel: () => void;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({ content, onCancel }) => {
  return (
    <div className="flex gap-3 items-start my-3 text-left">
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-md">
        <Bot className="w-4 h-4 animate-pulse" />
      </div>

      <div className="flex-1 max-w-[85%] space-y-2">
        <div className="bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-200/60 dark:border-slate-700/60 text-sm leading-relaxed">
          {content ? (
            <p className="whitespace-pre-wrap font-sans">
              {content}
              <span className="inline-block w-2 h-4 ml-1 bg-indigo-500 animate-pulse align-middle">▌</span>
            </p>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 py-1">
              <span className="text-xs font-medium">AI is thinking</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-slate-400">Streaming tokens...</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={onCancel}
            className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 text-xs py-0.5 px-2"
            iconLeft={<Square className="w-3 h-3 fill-current" />}
          >
            Stop generating
          </Button>
        </div>
      </div>
    </div>
  );
};
