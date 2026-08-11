import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { FileDropzone } from '../components/upload/FileDropzone';
import { FilePreview } from '../components/upload/FilePreview';
import { UploadProgress } from '../components/upload/UploadProgress';
import { ProcessingStatus } from '../components/upload/ProcessingStatus';
import { UploadError } from '../components/upload/UploadError';
import { useDocumentStore } from '../store/documentStore';
import { useUploadDocument } from '../hooks/useUploadDocument';
import { useDocumentStatus } from '../hooks/useDocumentStatus';

const HERO_WORDS = [
  'Analyze your contract in seconds.',
  'Identify risky clauses automatically.',
  'Get actionable legal insights instantly.',
];

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Typewriter effect state
  const [heroTextIndex, setHeroTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Store & Custom Hooks
  const { currentUpload, clearCurrentUpload } = useDocumentStore();
  const uploadMutation = useUploadDocument();

  const docId = currentUpload?.docId || null;
  const status = currentUpload?.status || 'idle';
  const progress = currentUpload?.progress || 0;

  // Poll status when docId is available
  const { status: polledStatus, isPolling } = useDocumentStatus(
    docId,
    status === 'processing' || status === 'uploading'
  );

  // Typewriter Effect Loop
  useEffect(() => {
    const currentWord = HERO_WORDS[heroTextIndex];
    const speed = isDeleting ? 40 : 80;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setDisplayText(currentWord.substring(0, displayText.length + 1));
        if (displayText === currentWord) {
          setTimeout(() => setIsDeleting(true), 1800);
        }
      } else {
        setDisplayText(currentWord.substring(0, displayText.length - 1));
        if (displayText === '') {
          setIsDeleting(false);
          setHeroTextIndex((prev) => (prev + 1) % HERO_WORDS.length);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, heroTextIndex]);

  // Client-side File Validation & Upload Trigger
  const handleDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      if (fileRejections.length > 0) {
        toast.error('Please upload a PDF, JPG, or PNG file under 10MB');
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      // Validate Size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit. Please choose a smaller file.');
        return;
      }

      // Validate File Type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a PDF, JPG, or PNG file under 10MB');
        return;
      }

      setSelectedFile(file);
      uploadMutation.mutate(file);
    },
    [uploadMutation]
  );

  // Auto-redirect to Processing page or Results page
  useEffect(() => {
    if (status === 'processing' && docId) {
      const redirectTimer = setTimeout(() => {
        navigate(`/documents/${docId}/processing`);
      }, 800);
      return () => clearTimeout(redirectTimer);
    } else if ((polledStatus === 'completed' || status === 'completed') && docId) {
      const redirectTimer = setTimeout(() => {
        navigate(`/documents/${docId}/results`);
      }, 1000);
      return () => clearTimeout(redirectTimer);
    }
  }, [polledStatus, status, docId, navigate]);

  const handleReset = () => {
    setSelectedFile(null);
    clearCurrentUpload();
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Top Header Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            iconLeft={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Hero Section with Typewriter Effect */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 min-h-[50px] flex items-center justify-center">
            <span>{displayText}</span>
            <span className="w-0.5 h-8 bg-indigo-600 dark:bg-indigo-400 ml-1 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Upload your contract to extract text, classify risk clauses, and obtain instant AI insights powered by PyMuPDF OCR.
          </p>
        </div>

        {/* Main Interactive Container */}
        <div className="space-y-6">
          {/* STATE 1: IDLE / DROPZONE */}
          {!selectedFile && status !== 'uploading' && status !== 'processing' && status !== 'failed' && (
            <FileDropzone onDrop={handleDrop} />
          )}

          {/* STATE 2: UPLOADING */}
          {status === 'uploading' && selectedFile && (
            <div className="space-y-4">
              <FilePreview file={selectedFile} disabled />
              <UploadProgress
                fileName={selectedFile.name}
                fileSize={selectedFile.size}
                progress={progress}
              />
            </div>
          )}

          {/* STATE 3: PROCESSING / POLLING */}
          {status === 'processing' && selectedFile && (
            <ProcessingStatus
              fileName={selectedFile.name}
              status={isPolling ? 'processing' : 'processing'}
              progress={progress}
              onCancel={handleReset}
            />
          )}

          {/* STATE 4: SUCCESS / COMPLETED */}
          {(status === 'completed' || polledStatus === 'completed') && selectedFile && (
            <div className="p-8 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center space-y-6 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-950 dark:text-emerald-100">
                  Upload Complete! Starting Analysis...
                </h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  Redirecting to your analysis dashboard results...
                </p>
              </div>
              <Button
                onClick={() => navigate(`/documents/${docId}/results`)}
                size="md"
                iconRight={<Zap className="w-4 h-4" />}
              >
                View Analysis Results Now
              </Button>
            </div>
          )}

          {/* STATE 5: ERROR */}
          {status === 'failed' && (
            <UploadError
              errorMessage={currentUpload?.error || 'An error occurred during file upload or processing.'}
              onRetry={() => selectedFile && uploadMutation.mutate(selectedFile)}
              onSelectNewFile={handleReset}
            />
          )}
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="p-4 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">256-bit Encrypted</h4>
              <p className="text-[10px] text-slate-400">Strict privacy & S3 security</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Sub-minute OCR</h4>
              <p className="text-[10px] text-slate-400">Fast PyMuPDF extraction</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">AI Risk Scoring</h4>
              <p className="text-[10px] text-slate-400">Automated clause classification</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
