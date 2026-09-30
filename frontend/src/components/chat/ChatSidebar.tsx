import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Trash2, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useChatStore } from '../../store/chatStore';
import { useChatStream } from '../../hooks/useChatStream';
import { useDocumentStore } from '../../store/documentStore';
import { useVaultStore } from '../../store/vaultStore';
import { ChatMessage } from './ChatMessage';
import { StreamingMessage } from './StreamingMessage';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';
import { ChatEmptyState } from './ChatEmptyState';

import { useAnalysisStore } from '../../store/analysisStore';
import { LanguagePreferenceToggle } from '../common/LanguagePreferenceToggle';

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
  const currentAnalysis = useAnalysisStore((state) => state.currentAnalysis);

  const recentDocs = useDocumentStore((state) => state.recentDocuments);
  const documents = useDocumentStore((state) => state.documents);
  const vaultContracts = useVaultStore((state) => state.contracts);

  const activeDoc =
    (docId && (documents.find((d) => d.id === docId) || recentDocs.find((d) => d.id === docId) || vaultContracts.find((c) => c.id === docId))) ||
    recentDocs[0] ||
    documents[0] ||
    vaultContracts[0];

  const activeDocName = activeDoc ? ('filename' in activeDoc ? activeDoc.filename : activeDoc.name) : null;
  const resolvedDocId = docId || activeDoc?.id || 'general';

  const {
    messages,
    sendMessage,
    isStreaming,
    streamingContent,
    cancel,
  } = useChatStream(resolvedDocId);

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
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                  {activeDocName ? `Context: ${activeDocName}` : 'RAG Legal Contract Specialist'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  title="Clear conversation history"
                  onClick={() => clearSession(resolvedDocId)}
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

          {/* Multi-Language Preference Toggle */}
          {currentAnalysis?.translation_used && (
            <div className="px-4 pt-3">
              <LanguagePreferenceToggle originalLanguage={currentAnalysis.original_language} />
            </div>
          )}

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
            isLoading={isStreaming}
            disabled={isStreaming}
            placeholder={activeDocName ? `Ask about ${activeDocName}...` : "Ask anything about your contract..."}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
