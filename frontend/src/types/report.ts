export interface Report {
  id: string;
  docId: string;
  url: string;
  createdAt: string;
  expiresAt?: string;
}

export interface ShareLink {
  id: string;
  docId: string;
  token: string;
  url: string;
  expiresAt: string;
  viewCount?: number;
}
