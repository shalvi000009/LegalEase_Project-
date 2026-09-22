import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { uploadDocument } from '../api/documents';
import { useDocumentStore } from '../store/documentStore';
import { UploadResponse } from '../types/document';

export function useUploadDocument() {
  const setCurrentUpload = useDocumentStore((state) => state.setCurrentUpload);
  const setUploadProgress = useDocumentStore((state) => state.setUploadProgress);
  const setUploadStatus = useDocumentStore((state) => state.setUploadStatus);
  const setUploadDocId = useDocumentStore((state) => state.setUploadDocId);

  return useMutation<UploadResponse, Error, File>({
    mutationFn: async (file: File) => {
      // Initialize upload state in store
      setCurrentUpload({
        file,
        progress: 0,
        status: 'uploading',
        docId: null,
        error: null,
      });

      return uploadDocument(file, (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });
    },
    onSuccess: (data) => {
      setUploadProgress(100);
      if (data.docId) {
        setUploadDocId(data.docId);
        setUploadStatus('processing');
        toast.success('File uploaded successfully! Starting contract analysis...');
      } else {
        setUploadStatus('processing');
      }
    },
    onError: (error) => {
      const msg = error.message || 'Failed to upload contract file';
      setUploadStatus('failed', msg);
      toast.error(msg);
    },
  });
}
