export type DocumentStatus =
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'uploaded'
  | 'done';

export interface Document {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: DocumentStatus;
  uploadProgress: number;
  riskScore: number | null;
  createdAt: string;
  updatedAt: string;
  s3Key?: string;
  message?: string;
}

export interface UploadRequest {
  file: File;
}

export interface UploadResponse {
  message?: string;
  document?: Partial<Document>;
  docId?: string;
  filename?: string;
  status?: string;
}

export interface DocumentStatusResponse {
  message?: string;
  document?: Document;
  status?: DocumentStatus;
  progress?: number;
  riskScore?: number | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  documents: T[];
  pagination: PaginationMeta;
}
