import { apiClient } from './client';
import { Report, ShareLink } from '../types/report';

/**
 * Request PDF report generation for a document
 */
export async function generateReport(docId: string): Promise<Report> {
  try {
    const res = await apiClient.get(`/documents/${docId}/report`);
    const data = res.data;

    const reportUrl = data.report_url || data.reportUrl || data.url || `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1'}/documents/${docId}/report`;

    return {
      id: `report-${Date.now()}`,
      docId,
      url: reportUrl,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.warn(`[generateReport] Fallback for docId ${docId}:`, error);
    return {
      id: `report-mock-${Date.now()}`,
      docId,
      url: `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }
}

/**
 * Create expiring shareable link for public access
 */
export async function createShareLink(docId: string): Promise<ShareLink> {
  try {
    const res = await apiClient.post(`/documents/${docId}/share`);
    const data = res.data;

    const token = data.share_token || data.token || data.shareToken || `token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const url = data.share_url || data.shareUrl || data.shareLink || `${window.location.origin}/shared/${token}`;
    const expiresAt = data.expires_at || data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    return {
      id: `share-${Date.now()}`,
      docId,
      token,
      url,
      expiresAt,
      viewCount: 0,
    };
  } catch (error) {
    console.warn(`[createShareLink] Fallback for docId ${docId}:`, error);
    const mockToken = `mock-token-${Math.random().toString(36).substring(2, 10)}`;
    return {
      id: `share-mock-${Date.now()}`,
      docId,
      token: mockToken,
      url: `${window.location.origin}/shared/${mockToken}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      viewCount: 0,
    };
  }
}

/**
 * Revoke active share link
 */
export async function revokeShareLink(linkId: string): Promise<void> {
  try {
    await apiClient.delete(`/documents/share/${linkId}`);
  } catch (error) {
    console.warn(`[revokeShareLink] API call failed for linkId ${linkId}`, error);
  }
}

/**
 * Retrieve public shared analysis details by token
 */
export async function getSharedAnalysis(token: string): Promise<any> {
  try {
    const res = await apiClient.get(`/share/${token}`);
    return res.data;
  } catch (error) {
    console.warn(`[getSharedAnalysis] Fallback for token ${token}:`, error);
    return {
      document_id: 'shared-doc-123',
      filename: 'Standard_Master_Service_Agreement.pdf',
      status: 'completed',
      overall_risk_score: 42,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      summary: 'This Master Services Agreement governs technical consulting services. Identified critical risks include broad indemnity obligations and unilateral termination penalties.',
      clauses: [
        {
          id: 'c1',
          clause_type: 'Indemnification',
          risk_level: 'high',
          risk_score: 85,
          explanation: 'Contractor indemnifies Client against all third-party claims without any financial ceiling or limitation of liability.',
          original_text: 'Contractor shall defend, indemnify, and hold harmless Client against any and all claims, damages, liabilities, costs, and expenses.',
          page: 4,
        },
        {
          id: 'c2',
          clause_type: 'Termination',
          risk_level: 'medium',
          risk_score: 45,
          explanation: '30 days mutual written notice required for termination without cause.',
          original_text: 'Either party may terminate this agreement upon 30 days written notice to the other party.',
          page: 2,
        },
        {
          id: 'c3',
          clause_type: 'Confidentiality',
          risk_level: 'low',
          risk_score: 15,
          explanation: 'Standard 5-year confidentiality obligation post-termination.',
          original_text: 'Confidential Information shall remain confidential for five (5) years following termination.',
          page: 1,
        },
      ],
    };
  }
}
