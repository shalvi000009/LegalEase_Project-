import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, AlertCircle, Sparkles, Share2 } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { useDocumentAnalysis } from '../hooks/useDocumentAnalysis';
import { ResizablePanels } from '../components/layout/ResizablePanels';
import { PDFViewer } from '../components/pdf/PDFViewer';
import { ResultsSidebar } from '../components/analysis/ResultsSidebar';
import { MobileTabs } from '../components/analysis/MobileTabs';
import { ResultsActions } from '../components/analysis/ResultsActions';
import { usePDFStore, PanelViewMode } from '../store/pdfStore';
import { usePDFSync } from '../hooks/usePDFSync';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { Clause } from '../types/analysis';

// Week 5 Integrations
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ShareModal } from '../components/share/ShareModal';
import { ReportDownloadButton } from '../components/report/ReportDownloadButton';
import { useChatStore } from '../store/chatStore';
import { useShareLink } from '../hooks/useShareLink';
import { useReport } from '../hooks/useReport';

export const ResultsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const docId = id || 'mock-doc-123';

  const { downloadReport } = useReport();

  // Responsive Hook for Desktop vs Mobile detection
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Zustand PDF Store & Sync Hook
  const { activePanel, setActivePanel, selectedClauseId, selectClause } = usePDFStore();
  const { navigateToClause } = usePDFSync();

  // Chat Store & Share Link Hooks
  const { isChatOpen, setIsChatOpen, toggleChatOpen, setCurrentDocId } = useChatStore();
  const { shareLink, isModalOpen, setIsModalOpen, generateShareLink, isGenerating: isGeneratingShare } = useShareLink();

  // Set current active doc ID for chat session
  useEffect(() => {
    setCurrentDocId(docId);
  }, [docId, setCurrentDocId]);

  // Sync URL query params `?panel=split|pdf|analysis`
  useEffect(() => {
    const urlPanel = searchParams.get('panel') as PanelViewMode;
    if (urlPanel && ['split', 'pdf', 'analysis'].includes(urlPanel)) {
      setActivePanel(urlPanel);
    } else {
      setActivePanel(isDesktop ? 'split' : 'analysis');
    }
  }, [searchParams, isDesktop, setActivePanel]);

  const handlePanelTabChange = (panel: PanelViewMode) => {
    setActivePanel(panel);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('panel', panel);
      return next;
    });
  };

  // Fetch Analysis via TanStack Query Hook
  const { data: analysis, isLoading, isError, refetch } = useDocumentAnalysis(docId);

  // Sync Handler when Clause Card "View in document" is clicked
  const handleViewInDocument = useCallback(
    (clause: Clause) => {
      if (!isDesktop) {
        handlePanelTabChange('pdf');
      }
      navigateToClause(clause);
    },
    [isDesktop, navigateToClause]
  );

  // Handler when "Ask AI about this clause" is clicked
  const handleAskAIAboutClause = useCallback(
    (_clause: Clause) => {
      setIsChatOpen(true);
    },
    [setIsChatOpen]
  );

  // Handler for citation click in chat
  const handleCitationClick = useCallback(
    (clauseId: string, _page?: number) => {
      selectClause(clauseId);
      if (!isDesktop) {
        handlePanelTabChange('pdf');
      }
    },
    [isDesktop, selectClause]
  );

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 animate-pulse h-28 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-64" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-40" />
            </div>
            <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-32" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[650px]">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 animate-pulse" />
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
              <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
              <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (isError || !analysis) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Failed to Load Analysis
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            We encountered an issue fetching the document analysis report. Please try again or re-upload your document.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate('/documents')} iconLeft={<ArrowLeft className="w-4 h-4" />}>
              Back to Documents
            </Button>
            <Button onClick={() => refetch()} iconLeft={<RefreshCw className="w-4 h-4" />}>
              Retry Analysis
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-full mx-auto space-y-4 pb-16 px-2 sm:px-4">
        {/* Page Top Navigation & Tab Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/documents')}
              iconLeft={<ArrowLeft className="w-4 h-4" />}
              className="text-xs"
            >
              My Documents
            </Button>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <h1 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
              {analysis.filename || 'Contract_Analysis.pdf'}
            </h1>
          </div>

          {/* View Mode Tabs (Split, Document, Analysis) */}
          <MobileTabs
            activeTab={activePanel}
            onTabChange={handlePanelTabChange}
            isDesktop={isDesktop}
          />

          {/* Header Action Buttons (Share, Download Report, AI Chat) */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateShareLink(docId)}
              iconLeft={<Share2 className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Share
            </Button>

            <ReportDownloadButton
              docId={docId}
              filename={analysis.filename}
              variant="outline"
              size="sm"
            />

            <Button
              size="sm"
              onClick={toggleChatOpen}
              iconLeft={<Sparkles className="w-3.5 h-3.5 text-amber-300" />}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              Ask AI Assistant
            </Button>
          </div>
        </div>

        {/* Side-by-Side Resizable Panels Container */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <ResizablePanels
            activePanel={activePanel}
            defaultSplit={50}
            leftPanel={
              <PDFViewer
                docId={docId}
                clauses={analysis.red_flags || []}
                onSelectClause={(clauseId) => selectClause(clauseId)}
              />
            }
            rightPanel={
              <ResultsSidebar
                analysis={analysis}
                selectedClauseId={selectedClauseId}
                onViewInDocument={handleViewInDocument}
                onAskAI={handleAskAIAboutClause}
              />
            }
          />
        </motion.div>

        {/* Sticky Action Footer */}
        <ResultsActions
          onAskAI={toggleChatOpen}
          onDownloadReport={() => downloadReport(docId, analysis?.filename)}
        />

        {/* Week 5 RAG Chat Sidebar Panel */}
        <ChatSidebar
          docId={docId}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          onCitationClick={handleCitationClick}
        />

        {/* Shareable Link Modal */}
        <ShareModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          shareLink={shareLink}
          isLoading={isGeneratingShare}
        />
      </div>
    </MainLayout>
  );
};
