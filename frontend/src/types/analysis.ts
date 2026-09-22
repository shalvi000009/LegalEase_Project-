export type RiskLevel = 'low' | 'medium' | 'high';

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
