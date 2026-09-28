import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { sendMessageStream } from '../api/chat';
import { Citation } from '../types/chat';

export function useChatStream(docId: string | null) {
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    sessions,
    isStreaming,
    streamingContent,
    setIsStreaming,
    setStreamingContent,
    appendStreamingContent,
    addMessage,
    finalizeMessage,
  } = useChatStore();

  const messages = docId ? sessions[docId]?.messages || [] : [];

  // Cleanup on unmount or doc change
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [docId]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (docId && isStreaming) {
      finalizeMessage(docId);
    }
    setIsStreaming(false);
  }, [docId, isStreaming, finalizeMessage, setIsStreaming]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!docId || !text.trim() || isStreaming) return;

      setError(null);
      
      // 1. Add user message
      addMessage(docId, {
        role: 'user',
        content: text.trim(),
      });

      // 2. Prepare streaming state
      setIsStreaming(true);
      setStreamingContent('');

      // Create new abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const extractedCitations: Citation[] = [];

      try {
        await sendMessageStream(
          docId,
          text.trim(),
          {
            onOpen: () => {
              setError(null);
            },
            onChunk: (token: string) => {
              appendStreamingContent(token);

              // Extract citations if pattern like [Clause c1] or [Page X] appears
              if (token.includes('[Clause') || token.includes('Section')) {
                const match = token.match(/c\d+/);
                if (match) {
                  extractedCitations.push({
                    clauseId: match[0],
                    text: token,
                  });
                }
              }
            },
            onComplete: () => {
              finalizeMessage(docId, extractedCitations.length > 0 ? extractedCitations : undefined);
            },
            onError: (err: Error) => {
              setError(err.message || 'Stream connection error');
              finalizeMessage(docId);
            },
          },
          abortControllerRef.current.signal
        );
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to send message');
          finalizeMessage(docId);
        }
      }
    },
    [docId, isStreaming, addMessage, setIsStreaming, setStreamingContent, appendStreamingContent, finalizeMessage]
  );

  return {
    messages,
    sendMessage,
    isStreaming,
    streamingContent,
    error,
    cancel,
  };
}
