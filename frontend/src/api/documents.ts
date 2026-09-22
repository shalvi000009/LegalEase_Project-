import { AxiosProgressEvent } from 'axios';
import { apiClient } from './client';
import { Document, DocumentStatusResponse, UploadResponse } from '../types/document';

/**
 * Upload contract document (PDF, PNG, JPG up to 10MB)
 * Uses POST /api/v1/documents with multipart field name `file`.
 */
export async function uploadDocument(
  file: File,
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiClient.post('/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });

  const data = res.data;
  console.log('[UPLOAD API RESPONSE]:', data);

  const docId = data.document?.id || data.documentId || data.id || data.docId;
  if (!docId) {
    throw new Error('Upload response missing document ID from backend');
  }

  return {
    message: data.message || 'Upload successful',
    docId,
    filename: data.document?.filename || data.filename || file.name,
    status: data.document?.status || data.status || 'uploaded',
    document: data.document
      ? {
          id: data.document.id,
          filename: data.document.filename,
          fileType: file.type,
          fileSize: file.size,
          status: data.document.status,
          uploadProgress: 100,
          riskScore: data.document.riskScore ?? null,
          createdAt: data.document.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          s3Key: data.document.s3_key,
        }
      : undefined,
  };
}

/**
 * Poll document analysis status
 * Uses GET /api/v1/documents/{id}
 */
export async function getDocumentStatus(docId: string): Promise<DocumentStatusResponse> {
  const res = await apiClient.get(`/documents/${docId}`);
  const data = res.data;

  if (data.document) {
    const rawStatus = data.document.status || 'processing';
    const isDone = rawStatus === 'done' || rawStatus === 'completed';
    const isFailed = rawStatus === 'failed';

    return {
      message: isDone
        ? 'Analysis complete'
        : isFailed
        ? 'Analysis failed'
        : 'Document is processing...',
      status: isDone ? 'completed' : isFailed ? 'failed' : 'processing',
      progress: isDone ? 100 : isFailed ? 0 : 65,
      riskScore: data.document.riskScore ?? null,
      document: {
        id: data.document.id,
        filename: data.document.filename,
        fileType: data.document.fileType || 'application/pdf',
        fileSize: data.document.fileSize || 1024 * 500,
        status: isDone ? 'completed' : isFailed ? 'failed' : 'processing',
        uploadProgress: 100,
        riskScore: data.document.riskScore ?? null,
        createdAt: data.document.created_at || new Date().toISOString(),
        updatedAt: data.document.updated_at || new Date().toISOString(),
      },
    };
  }

  return {
    message: data.message || 'Processing document...',
    status: (data.status as any) || 'processing',
    progress: data.progress ?? 50,
    riskScore: data.riskScore ?? null,
  };
}

/**
 * Retrieve document details by ID
 */
export async function getDocument(docId: string): Promise<Document> {
  const statusRes = await getDocumentStatus(docId);
  if (statusRes.document) {
    return statusRes.document;
  }
  throw new Error(`Document metadata not found for ID ${docId}`);
}
