import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ChatSession, Message } from '../types/chat';

interface ChatStore {
  sessions: Record<string, ChatSession>;
  currentDocId: string | null;
  isStreaming: boolean;
  streamingContent: string;
  isChatOpen: boolean;

  // Actions
  setCurrentDocId: (docId: string | null) => void;
  setIsChatOpen: (isOpen: boolean) => void;
  toggleChatOpen: () => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (token: string) => void;
  
  addMessage: (docId: string, message: Omit<Message, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => void;
  finalizeMessage: (docId: string, citations?: Message['citations']) => void;
  clearSession: (docId: string) => void;
  getMessages: (docId: string) => Message[];
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      currentDocId: null,
      isStreaming: false,
      streamingContent: '',
      isChatOpen: false,

      setCurrentDocId: (docId) => set({ currentDocId: docId }),
      setIsChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
      toggleChatOpen: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
      setIsStreaming: (isStreaming) => set({ isStreaming }),
      setStreamingContent: (streamingContent) => set({ streamingContent }),
      appendStreamingContent: (token) =>
        set((state) => ({ streamingContent: state.streamingContent + token })),

      addMessage: (docId, msgInput) => {
        const now = new Date().toISOString();
        const newMessage: Message = {
          id: msgInput.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          role: msgInput.role,
          content: msgInput.content,
          timestamp: msgInput.timestamp || now,
          citations: msgInput.citations,
        };

        set((state) => {
          const existingSession = state.sessions[docId] || {
            docId,
            messages: [],
            createdAt: now,
            updatedAt: now,
          };

          // Limit to max 50 messages per document
          const updatedMessages = [...existingSession.messages, newMessage].slice(-50);

          return {
            sessions: {
              ...state.sessions,
              [docId]: {
                ...existingSession,
                messages: updatedMessages,
                updatedAt: now,
              },
            },
          };
        });
      },

      finalizeMessage: (docId, citations) => {
        const { streamingContent, addMessage } = get();
        if (streamingContent.trim()) {
          addMessage(docId, {
            role: 'assistant',
            content: streamingContent,
            citations,
          });
        }
        set({ isStreaming: false, streamingContent: '' });
      },

      clearSession: (docId) => {
        set((state) => {
          const updatedSessions = { ...state.sessions };
          delete updatedSessions[docId];
          return { sessions: updatedSessions };
        });
      },

      getMessages: (docId) => {
        return get().sessions[docId]?.messages || [];
      },
    }),
    {
      name: 'legalease_chat_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sessions: state.sessions }),
    }
  )
);
