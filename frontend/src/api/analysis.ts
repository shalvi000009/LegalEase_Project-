import { apiClient } from './client';
import { AnalysisResult } from '../types/analysis';

/**
 * Mock Fallback Analysis Result for offline / stub testing
 * TODO: Backend integration with Rishi's model & Shalvi's GET /api/v1/documents/{id}/analysis
 */
export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
  doc_id: 'mock-doc-123',
  filename: 'Employment_Agreement_2026.pdf',
  risk_score: 74,
  risk_level: 'high',
  summary:
    'This contract contains several concerning clauses, including an indefinite worldwide non-compete clause and unbalanced termination terms with short employer notice. Review sections on intellectual property and indemnification carefully before signing.',
  key_obligations: [
    'Work 40 hours per week in designated department',
    'Maintain strict confidentiality during and after employment term',
    'Provide 30 days written notice prior to voluntary resignation',
    'Assign work products and inventions created during employment',
  ],
  other_obligations: [
    'Employer may modify job title and duties at any time at sole discretion',
    'Employee must return all equipment and proprietary data within 48 hours of departure',
  ],
  red_flags: [
    {
      clause_id: 'cl_001',
      clause_type: 'termination',
      risk_level: 'high',
      risk_score: 85,
      explanation:
        'The employer can terminate your contract without cause with only 7 days notice, whereas you must provide 30 days notice.',
      original_text:
        'Either party may terminate this agreement with seven (7) days written notice without cause at the sole discretion of the Employer.',
      risk_reason:
        'Unbalanced notice period severely favors the employer and leaves the employee with inadequate transition time.',
      fair_standard:
        'Notice periods should be mutual (e.g., 30 days for both parties) or include severance pay compensation.',
      page_number: 2,
      confidence: 0.94,
    },
    {
      clause_id: 'cl_002',
      clause_type: 'non_compete',
      risk_level: 'high',
      risk_score: 95,
      explanation:
        'Restricts you from working for any competitor worldwide for an indefinite duration after termination.',
      original_text:
        'The restricted party agrees not to compete directly or indirectly with the company worldwide in any capacity for an indefinite duration following termination.',
      risk_reason:
        'Perpetual worldwide non-compete restrictions are legally unenforceable in many jurisdictions and unfairly restrict career mobility.',
      fair_standard:
        'Geographic restriction limited to active client operating region for a maximum of 6 to 12 months with post-employment stipend.',
      page_number: 4,
      confidence: 0.98,
    },
    {
      clause_id: 'cl_003',
      clause_type: 'indemnity',
      risk_level: 'medium',
      risk_score: 62,
      explanation:
        'Broad employee indemnity covering all third-party legal claims including attorney fees.',
      original_text:
        'Employee shall defend, indemnify, and hold harmless the Company against any and all liabilities, losses, damages, or costs including attorney fees arising out of performance of duties.',
      risk_reason:
        'Imposes personal financial liability on the employee for routine operational legal disputes.',
      fair_standard:
        'Indemnification should be limited to intentional misconduct or gross negligence, excluding standard duties.',
      page_number: 5,
      confidence: 0.89,
    },
    {
      clause_id: 'cl_004',
      clause_type: 'intellectual_property',
      risk_level: 'medium',
      risk_score: 55,
      explanation:
        'Company claims ownership of all inventions created outside working hours if broadly related to industry.',
      original_text:
        'All inventions, work product, and discoveries conceived or developed during employment, whether during working hours or not, shall belong exclusively to Company.',
      risk_reason:
        'Overly broad IP assignment captures personal side projects created on personal equipment outside work hours.',
      fair_standard:
        'IP assignment restricted strictly to work produced during working hours using company resources directly related to assigned duties.',
      page_number: 3,
      confidence: 0.91,
    },
    {
      clause_id: 'cl_005',
      clause_type: 'governing_law',
      risk_level: 'low',
      risk_score: 18,
      explanation:
        'Governed by the laws of New York with exclusive venue in New York state courts.',
      original_text:
        'This Agreement shall be governed by and construed in accordance with the laws of the State of New York without regard to conflict of laws principles.',
      page_number: 6,
      confidence: 0.99,
    },
  ],
  missing_clauses: [
    'Severance pay protection',
    'Mutual notice period equality',
    'Limitation of liability financial cap',
  ],
  suggested_questions: [
    'Can I negotiate a 30-day mutual notice period for termination?',
    'Can the non-compete clause be limited to 12 months within my geographic area?',
    'What side-projects are exempt from the intellectual property assignment clause?',
    'Is there a liability cap for employee indemnification obligations?',
  ],
  processing_time_ms: 12400,
  created_at: '2026-08-04T10:30:00Z',
  page_count: 6,
};

/**
 * Fetch document analysis result by document ID
 * Endpoint: GET /api/v1/documents/{id}/analysis
 */
export async function getDocumentAnalysis(docId: string): Promise<AnalysisResult> {
  const res = await apiClient.get(`/documents/${docId}/analysis`);
  const data = res.data;

  const analysisData = data.analysis || data;
  const clausesRaw = analysisData.clauses || analysisData.red_flags || [];

  const transformedClauses = clausesRaw.map((c: any, index: number) => ({
    clause_id: c.clause_id || c.id || `cl_${index + 1}`,
    clause_type: c.clause_type || 'other',
    risk_level: (c.risk_level as any) || (c.risk_score > 70 ? 'high' : c.risk_score > 40 ? 'medium' : 'low'),
    explanation: c.explanation || c.matching_rules?.join('; ') || c.text || 'No explanation provided.',
    original_text: c.original_text || c.text || '',
    risk_score: typeof c.risk_score === 'number' ? c.risk_score : 50,
    page_number: c.page_number || c.chunk_index || index + 1,
    confidence: c.confidence ?? 0.9,
    risk_reason: c.risk_reason || (c.matching_rules?.length ? c.matching_rules.join('. ') : undefined),
    fair_standard: c.fair_standard,
    matching_rules: c.matching_rules,
  }));

  const overallScore = analysisData.overall_risk_score ?? analysisData.risk_score ?? 50;
  const overallLevel =
    analysisData.overall_risk_level ??
    analysisData.risk_level ??
    (overallScore > 70 ? 'high' : overallScore > 40 ? 'medium' : 'low');

  const defaultDimensions = {
    legal: Math.min(100, Math.round(overallScore * 0.95)),
    financial: Math.min(100, Math.round(overallScore * 1.1)),
    litigation: Math.min(100, Math.round(overallScore * 0.85)),
    privacy: Math.min(100, Math.round(overallScore * 0.6)),
    employment: Math.min(100, Math.round(overallScore * 0.7)),
  };

  return {
    doc_id: docId,
    filename: analysisData.filename || data.filename || `Document_${docId.substring(0, 8)}.pdf`,
    risk_score: overallScore,
    risk_level: overallLevel,
    risk_dimensions: analysisData.risk_dimensions || data.risk_dimensions || defaultDimensions,
    summary: analysisData.summary || 'Document analysis completed successfully.',
    key_obligations: analysisData.key_obligations || [],
    other_obligations: analysisData.other_obligations || [],
    red_flags: transformedClauses,
    missing_clauses: analysisData.missing_clauses || [],
    suggested_questions: analysisData.suggested_questions || [],
    processing_time_ms: analysisData.processing_time_ms || 8500,
    created_at: analysisData.created_at || new Date().toISOString(),
    page_count: analysisData.page_count || 1,
  };
}
