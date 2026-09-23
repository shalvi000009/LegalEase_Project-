import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Trash2, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useChatStore } from '../../store/chatStore';
import { useChatStream } from '../../hooks/useChatStream';
import { ChatMessage } from './ChatMessage';
import { StreamingMessage } from './StreamingMessage';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { ChatEmptyState } from './ChatEmptyState';

interface ChatSidebarProps {
  docId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCitationClick?: (clauseId: string, page?: number) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  docId,
  isOpen,
  onClose,
  onCitationClick,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { clearSession } = useChatStore();

  const {
    messages,
    sendMessage,
    isStreaming,
    streamingContent,
    cancel,
  } = useChatStream(docId);

  // Auto-scroll to bottom on new messages or streaming tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, isStreaming]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Mobile Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />

        {/* Sliding Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 border-l border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  Ask AI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">RAG Legal Contract Specialist</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  title="Clear conversation history"
                  onClick={() => docId && clearSession(docId)}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="xs"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Quick Suggestions Header */}
          {messages.length > 0 && (
            <SuggestedQuestions onSelect={sendMessage} />
          )}

          {/* Scrollable Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30 dark:bg-slate-950/30">
            {messages.length === 0 && !isStreaming ? (
              <ChatEmptyState onSelectQuestion={sendMessage} />
            ) : (
              <>
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    onCitationClick={onCitationClick}
                  />
                ))}

                {isStreaming && (
                  <StreamingMessage
                    content={streamingContent}
                    onCancel={cancel}
                  />
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Bottom Fixed Input */}
          <ChatInput
            onSend={sendMessage}
            disabled={isStreaming || !docId}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
