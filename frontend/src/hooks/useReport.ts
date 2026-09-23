import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { generateReport } from '../api/reports';

export function useReport() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  const downloadReport = useCallback(async (docId: string, filename?: string) => {
    setIsGenerating(true);
    const toastId = toast.loading('Generating official contract PDF report...');

    try {
      const report = await generateReport(docId);
      setReportUrl(report.url);

      // Trigger automatic file download
      const link = document.createElement('a');
      link.href = report.url;
      link.target = '_blank';
      link.download = filename ? `LegalEase_Report_${filename}` : `LegalEase_Report_${docId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Contract PDF report downloaded successfully!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate PDF report', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    downloadReport,
    isGenerating,
    reportUrl,
  };
}
