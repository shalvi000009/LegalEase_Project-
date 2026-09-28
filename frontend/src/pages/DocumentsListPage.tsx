import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, UploadCloud, ArrowRight } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useDocumentStore } from '../store/documentStore';

export const DocumentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const recentDocuments = useDocumentStore((state) => state.recentDocuments);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Contracts</h1>
            <p className="text-xs text-slate-500">Manage and inspect your uploaded contract documents</p>
          </div>

          <Button
            size="sm"
            onClick={() => navigate('/upload')}
            iconLeft={<UploadCloud className="w-4 h-4" />}
          >
            Upload Contract
          </Button>
        </div>

        {recentDocuments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents analyzed yet"
            description="Upload your first legal contract (PDF or Image) to receive automated clause classification and risk scoring."
            actionLabel="Upload Contract Now"
            actionHref="/upload"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentDocuments.map((doc) => (
              <Card key={doc.id} className="p-5 space-y-4 hover:border-indigo-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <Badge variant={doc.status === 'completed' ? 'success' : 'info'} size="sm">
                    {doc.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={doc.filename}>
                    {doc.filename}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Added {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500">
                    Risk Score: {doc.riskScore !== null ? `${doc.riskScore}/100` : 'N/A'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/documents/${doc.id}/results`)}
                    iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};
