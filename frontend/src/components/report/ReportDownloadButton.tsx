import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useReport } from '../../hooks/useReport';

interface ReportDownloadButtonProps {
  docId: string;
  filename?: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'secondary';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const ReportDownloadButton: React.FC<ReportDownloadButtonProps> = ({
  docId,
  filename,
  variant = 'outline',
  size = 'sm',
  className = '',
}) => {
  const { downloadReport, isGenerating } = useReport();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => downloadReport(docId, filename)}
      disabled={isGenerating}
      className={className}
      iconLeft={
        isGenerating ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
        ) : (
          <Download className="w-4 h-4" />
        )
      }
    >
      {isGenerating ? 'Generating Report...' : 'Download PDF Report'}
    </Button>
  );
};
