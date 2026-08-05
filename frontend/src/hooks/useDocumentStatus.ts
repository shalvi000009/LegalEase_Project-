import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getDocumentStatus } from '../api/documents';
import { useDocumentStore } from '../store/documentStore';

export function useDocumentStatus(docId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const addRecentDocument = useDocumentStore((state) => state.addRecentDocument);
  const setUploadStatus = useDocumentStore((state) => state.setUploadStatus);

  const [errorCount, setErrorCount] = useState(0);
  const hasTriggeredCompletion = useRef(false);

  // Exponential backoff interval calculation: 3000ms * (2^errorCount), max 30000ms
  const currentInterval = Math.min(3000 * Math.pow(2, errorCount), 30000);

  const query = useQuery({
    queryKey: ['documentStatus', docId],
    queryFn: async () => {
      if (!docId) throw new Error('No document ID provided');
      try {
        const res = await getDocumentStatus(docId);
        setErrorCount(0); // reset backoff on success
        return res;
      } catch (err) {
        setErrorCount((prev) => prev + 1);
        throw err;
      }
    },
    enabled: Boolean(docId) && enabled,
    refetchInterval: (queryState) => {
      const status = queryState.state.data?.status;
      if (status === 'completed' || status === 'done' || status === 'failed') {
        return false;
      }
      return currentInterval;
    },
    refetchIntervalInBackground: false,
  });

  const data = query.data;

  useEffect(() => {
    if (!data || !docId || hasTriggeredCompletion.current) return;

    if (data.status === 'completed' || data.status === 'done') {
      hasTriggeredCompletion.current = true;
      setUploadStatus('completed');
      toast.success('Contract analysis completed successfully!');
      
      queryClient.invalidateQueries({ queryKey: ['documents'] });

      if (data.document) {
        addRecentDocument(data.document);
      } else {
        addRecentDocument({
          id: docId,
          filename: 'contract.pdf',
          fileType: 'application/pdf',
          fileSize: 1024 * 1000,
          status: 'completed',
          uploadProgress: 100,
          riskScore: data.riskScore ?? 28,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } else if (data.status === 'failed') {
      hasTriggeredCompletion.current = true;
      setUploadStatus('failed', data.message || 'Document analysis failed');
      toast.error(data.message || 'Document processing failed');
    }
  }, [data, docId, addRecentDocument, setUploadStatus, queryClient]);

  return {
    data,
    isLoading: query.isLoading,
    error: query.error,
    isPolling: query.isFetching && data?.status === 'processing',
    status: data?.status || 'processing',
    progress: data?.progress || 0,
    riskScore: data?.riskScore || null,
  };
}
