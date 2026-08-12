import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Sparkles } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/documents')}
            iconLeft={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Documents
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Document Overview</h1>
            <p className="text-xs text-slate-500">ID: {id}</p>
          </div>
        </div>

        <Card className="p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold">Document Ingestion Complete</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Document metadata has been recorded and processed. Click below to inspect detailed AI risk analysis and clause breakdown.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Button
              size="sm"
              onClick={() => navigate(`/documents/${id}/results`)}
              iconRight={<Sparkles className="w-4 h-4" />}
            >
              View Full Results
            </Button>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
};
