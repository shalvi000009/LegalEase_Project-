import React, { useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Spinner } from '../components/ui/Spinner';

export const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate(`/documents/${id}/results`, { replace: true });
    }
  }, [id, navigate]);

  if (!id) {
    return <Navigate to="/documents" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-3">
      <Spinner size="lg" variant="primary" />
      <p className="text-xs font-semibold text-slate-500 animate-pulse">
        Opening Document Analysis...
      </p>
    </div>
  );
};
