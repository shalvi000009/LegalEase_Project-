import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { downloadReportFile } from '../api/reports';

export function useReport() {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadReport = useCallback(async (docId: string, filename?: string) => {
    setIsGenerating(true);
    const toastId = toast.loading('Generating official contract PDF report...');

    try {
      await downloadReportFile(docId, filename);
      toast.success('Contract PDF report downloaded successfully!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Failed to download PDF report', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    downloadReport,
    isGenerating,
  };
}
