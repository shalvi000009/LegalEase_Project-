import { useQuery } from '@tanstack/react-query';
import { getDocumentAnalysis } from '../api/analysis';
import { useAnalysisStore } from '../store/analysisStore';
import { AnalysisResult } from '../types/analysis';

export function useDocumentAnalysis(docId: string | undefined) {
  const setCurrentAnalysis = useAnalysisStore((state) => state.setCurrentAnalysis);

  return useQuery<AnalysisResult, Error>({
    queryKey: ['documentAnalysis', docId],
    queryFn: async () => {
      if (!docId) throw new Error('Document ID is required');
      const data = await getDocumentAnalysis(docId);
      setCurrentAnalysis(data);
      return data;
    },
    enabled: Boolean(docId),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
