import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, UploadCloud, ChevronLeft, ChevronRight, AlertTriangle, Trash2 } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { DocumentFilters } from '../components/documents/DocumentFilters';
import { DocumentCard } from '../components/documents/DocumentCard';
import { DocumentCardSkeleton } from '../components/documents/DocumentCardSkeleton';
import { useDocuments } from '../hooks/useDocuments';
import { useDocumentStore } from '../store/documentStore';
import { ShareModal } from '../components/share/ShareModal';
import { useShareLink } from '../hooks/useShareLink';
import { useReport } from '../hooks/useReport';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    documents,
    pagination,
    isLoading,
    deleteDocument,
    isDeleting,
  } = useDocuments();

  const { currentPage, setPagination } = useDocumentStore();
  const { shareLink, isModalOpen, setIsModalOpen, generateShareLink, isGenerating } = useShareLink();
  const { downloadReport } = useReport();

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (deleteTargetId) {
      await deleteDocument(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const handleShare = async (docId: string) => {
    await generateShareLink(docId);
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Document History
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Access and manage your uploaded contracts, AI risk scores, and generated reports.
            </p>
          </div>

          <Button
            onClick={() => navigate('/upload')}
            iconLeft={<UploadCloud className="w-4 h-4" />}
            className="shadow-md"
          >
            Upload Contract
          </Button>
        </div>

        {/* Filter Controls Bar */}
        <DocumentFilters />

        {/* Grid Area */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <DocumentCardSkeleton key={i} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents found"
            description="No legal contracts match your filter criteria or search query. Upload a new PDF to get started."
            actionLabel="Upload New Document"
            actionHref="/upload"
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={(id) => navigate(`/documents/${id}/results`)}
                onDelete={(id) => setDeleteTargetId(id)}
                onShare={handleShare}
                onDownloadReport={(id) => downloadReport(id)}
              />
            ))}
          </motion.div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total documents)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPagination(currentPage - 1, pagination.totalPages, pagination.total)}
                iconLeft={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pagination.totalPages}
                onClick={() => setPagination(currentPage + 1, pagination.totalPages, pagination.total)}
                iconRight={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Share Modal */}
        <ShareModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          shareLink={shareLink}
          isLoading={isGenerating}
        />

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteTargetId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Delete Contract Document?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    This action is permanent and will remove all clause analysis and risk assessments for this document.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteTargetId(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    iconLeft={<Trash2 className="w-4 h-4" />}
                    className="flex-1"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
};
