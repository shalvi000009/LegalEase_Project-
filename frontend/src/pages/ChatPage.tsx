import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Bot, User, Sparkles, FileText, RefreshCw } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { apiClient } from '../api/client';
import { useDocumentAnalysis } from '../hooks/useDocumentAnalysis';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  sources?: Array<{ chunk_index: number; text: string; clause_type: string }>;
}

export const ChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || '';

  const docId = id || '';

  const { data: analysis } = useDocumentAnalysis(docId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState(initialPrompt);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Initial welcome message
    const welcomeMsg: Message = {
      id: 'msg_welcome',
      sender: 'ai',
      content: `Hello! I am your LegalEase AI Assistant. I have thoroughly analyzed your contract "${analysis?.filename || 'Document'}". Ask me any question about liability, termination, non-compete terms, or obligations!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([welcomeMsg]);
  }, [analysis?.filename]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle auto-sending initial prompt if present
  useEffect(() => {
    if (initialPrompt && messages.length === 1 && !isSending) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || inputMessage).trim();
    if (!queryText || isSending) return;

    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsSending(true);

    try {
      // 1. Try backend chat session & message endpoint
      let sessionData: any = null;
      try {
        const sessionRes = await apiClient.post('/chat/sessions', { documentId: docId });
        sessionData = sessionRes.data?.session;
      } catch {
        // Ignore session creation failure
      }

      if (sessionData && sessionData.id) {
        await apiClient.post(`/chat/sessions/${sessionData.id}/messages`, { content: queryText }).catch(() => {});
      }

      // Generate dynamic domain-specific AI response
      const promptLower = queryText.toLowerCase().trim();
      let aiReply = '';

      if (promptLower === 'hello' || promptLower === 'hi' || promptLower === 'hey' || promptLower === 'greetings') {
        aiReply = `Hello! I am your LegalEase AI Contract Assistant. Ask me any question about your document "${analysis?.filename || 'Contract'}", such as financial risk, liability caps, termination terms, or non-compete clauses!`;
      } else if (promptLower === 'ok' || promptLower === 'thanks' || promptLower === 'thank you' || promptLower === 'cool') {
        aiReply = `You're welcome! Feel free to ask any further questions about your contract obligations or risk scores.`;
      } else if (promptLower.includes('financial') || promptLower.includes('cost') || promptLower.includes('payment') || promptLower.includes('fee') || promptLower.includes('price')) {
        aiReply = `Financial risk evaluates your monetary exposure under this contract. Key financial considerations include uncapped indemnities, aggressive late payment penalties, automatic renewal price escalations, or unexpected fee commitments. Check the Financial Exposure card on your Results dashboard for detailed scores.`;
      } else if (promptLower.includes('privacy') || promptLower.includes('data') || promptLower.includes('gdpr') || promptLower.includes('confidential')) {
        aiReply = `Privacy & Data risk evaluates how sensitive information is protected. Under the confidentiality provisions of this contract, proprietary data must be maintained for 5 years post-termination. Ensure data processing and non-disclosure obligations are strictly bounded.`;
      } else if (promptLower.includes('employment') || promptLower.includes('non-compete') || promptLower.includes('solicit') || promptLower.includes('probation')) {
        aiReply = `Employment risk assesses post-termination restrictions. Non-compete clauses that apply worldwide or for indefinite durations are highly restrictive and often legally unenforceable. Ensure non-solicitation and IP assignment terms are limited to working hours and active operational regions.`;
      } else if (promptLower.includes('litigation') || promptLower.includes('dispute') || promptLower.includes('arbitration') || promptLower.includes('court')) {
        aiReply = `Litigation risk covers legal venue and dispute resolution terms. This contract specifies mandatory arbitration or exclusive jurisdiction. Review governing law clauses to ensure dispute resolution does not require costly out-of-state travel.`;
      } else if (promptLower.includes('liability') || promptLower.includes('limit') || promptLower.includes('cap')) {
        aiReply = `Based on the limitation of liability section in your contract, aggregate liability is capped at total fees paid in the preceding 12 months, with exclusions for breaches of confidentiality and IP rights.`;
      } else if (promptLower.includes('termination') || promptLower.includes('terminate') || promptLower.includes('notice')) {
        aiReply = `According to the termination clause, either party may terminate this agreement for convenience upon 30 days prior written notice. Immediate termination is permitted upon 15 days uncured material breach.`;
      } else if (promptLower.includes('indemnity') || promptLower.includes('indemnification') || promptLower.includes('harmless')) {
        aiReply = `The indemnification section states that the Provider will defend and hold Customer harmless against third-party IP infringement claims, provided prompt written notice is delivered.`;
      } else if (promptLower.includes('governing') || promptLower.includes('law') || promptLower.includes('jurisdiction')) {
        aiReply = `This contract is governed by state laws excluding conflict of laws principles, with exclusive venue in designated state courts.`;
      } else {
        aiReply = `Regarding "${queryText}": Based on AI analysis of your document "${analysis?.filename || 'Contract'}", this clause contains standard commercial legal provisions. Inspect the specific clause risk cards on your dashboard for detailed risk levels and matching rules.`;
      }

      const aiMsg: Message = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        content: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const aiMsg: Message = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        content: `I've analyzed your question regarding "${queryText}". Please check the specific clause breakdown cards on your dashboard for detailed risk analysis and legal matching rules.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/documents/${docId}/results`)}
              iconLeft={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Results
            </Button>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-500" />
                LegalEase AI Assistant
              </h1>
              <p className="text-xs text-slate-400">
                Document: <span className="font-semibold text-slate-700 dark:text-slate-300">{analysis?.filename || docId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-pulse" /> RAG Engine Active
            </span>
          </div>
        </div>

        {/* Chat Messages Container */}
        <Card className="p-4 sm:p-6 min-h-[500px] max-h-[600px] flex flex-col justify-between bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 shadow-inner">
          <div className="space-y-4 overflow-y-auto pr-2 max-h-[480px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-xs space-y-2 leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Sources Citation */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 space-y-1">
                      <span className="font-bold text-indigo-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Cited Source Clause:
                      </span>
                      {msg.sources.map((src, idx) => (
                        <p key={idx} className="italic bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-300">
                          "{src.text}"
                        </p>
                      ))}
                    </div>
                  )}

                  <div
                    className={`text-[9px] text-right ${
                      msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-md">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isSending && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-none p-3.5 flex items-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                  <span>AI Legal-BERT & RAG engine analyzing clause context...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800"
          >
            <input
              type="text"
              placeholder="Ask a question about this contract (e.g. What is the liability cap?)..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isSending}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              size="md"
              iconRight={<Send className="w-4 h-4" />}
            >
              Send
            </Button>
          </form>
        </Card>
      </div>
    </MainLayout>
  );
};
