export type RiskLevel = 'low' | 'medium' | 'high';

export type RiskDimensionKey = 'financial' | 'legal' | 'privacy' | 'employment' | 'litigation';

export interface RiskDimensions {
  financial: number;
  legal: number;
  privacy: number;
  employment: number;
  litigation: number;
}

export const DIMENSION_WEIGHTS: Record<RiskDimensionKey, number> = {
  legal: 0.30,
  financial: 0.25,
  litigation: 0.20,
  privacy: 0.15,
  employment: 0.10,
};

export const DIMENSION_LABELS: Record<RiskDimensionKey, string> = {
  financial: 'Financial',
  legal: 'Legal',
  privacy: 'Privacy',
  employment: 'Employment',
  litigation: 'Litigation',
};

export type ClauseType =
  | 'termination'
  | 'indemnity'
  | 'non_compete'
  | 'confidentiality'
  | 'limitation_of_liability'
  | 'payment_terms'
  | 'governing_law'
  | 'intellectual_property'
  | 'force_majeure'
  | 'severability'
  | 'non_solicitation'
  | 'assignment'
  | 'arbitration'
  | 'jurisdiction'
  | 'auto_renewal'
  | 'data_privacy'
  | 'payment'
  | 'liability'
  | 'ip'
  | 'other'
  | (string & {});

export const CLAUSE_DIMENSION_MAP: Record<string, RiskDimensionKey[]> = {
  termination: ['employment', 'legal'],
  non_compete: ['employment', 'legal'],
  non_solicitation: ['employment'],
  confidentiality: ['privacy', 'legal'],
  data_privacy: ['privacy'],
  indemnity: ['financial', 'litigation', 'legal'],
  limitation_of_liability: ['financial', 'litigation'],
  liability: ['financial', 'litigation'],
  payment_terms: ['financial'],
  payment: ['financial'],
  auto_renewal: ['financial', 'employment'],
  governing_law: ['legal', 'litigation'],
  jurisdiction: ['legal', 'litigation'],
  arbitration: ['legal', 'litigation'],
  intellectual_property: ['legal'],
  ip: ['legal'],
  assignment: ['legal'],
  force_majeure: ['legal'],
  severability: ['legal'],
  other: ['legal'],
};

export function getDimensionsForClauseType(clauseType: ClauseType | string): RiskDimensionKey[] {
  const normalized = String(clauseType).toLowerCase();
  if (CLAUSE_DIMENSION_MAP[normalized]) {
    return CLAUSE_DIMENSION_MAP[normalized];
  }
  if (normalized.includes('pay') || normalized.includes('fee') || normalized.includes('price')) return ['financial'];
  if (normalized.includes('priv') || normalized.includes('secret') || normalized.includes('data')) return ['privacy'];
  if (normalized.includes('employ') || normalized.includes('work') || normalized.includes('staff')) return ['employment'];
  if (normalized.includes('dispute') || normalized.includes('court') || normalized.includes('claim')) return ['litigation'];
  return ['legal'];
}

export interface Clause {
  clause_id: string;
  clause_type: ClauseType;
  risk_level: RiskLevel;
  explanation: string;
  original_text: string;
  risk_score: number; // 0 - 100
  page_number?: number;
  confidence?: number; // 0 - 1
  chunk_index?: number;
  risk_reason?: string;
  fair_standard?: string;
  matching_rules?: string[];
}

export interface RiskDimensions {
  financial: number;
  legal: number;
  privacy: number;
  employment: number;
  litigation: number;
  [key: string]: number;
}

export interface AnalysisResult {
  doc_id: string;
  filename?: string;
  risk_score: number; // 0 - 100
  risk_level: RiskLevel;
  risk_dimensions?: RiskDimensions;
  summary: string;
  key_obligations: string[];
  other_obligations?: string[];
  red_flags: Clause[];
  missing_clauses: string[];
  suggested_questions: string[];
  processing_time_ms: number;
  created_at: string;
  page_count?: number;
}

