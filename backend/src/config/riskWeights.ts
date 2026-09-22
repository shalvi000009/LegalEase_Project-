export interface RiskDimensions {
  financial: number;
  legal: number;
  privacy: number;
  employment: number;
  litigation: number;
}

export type RiskDimensionKey = keyof RiskDimensions;

/**
 * Default dimension weights for weighted overall risk score.
 * Legal 30%, Financial 25%, Litigation 20%, Privacy 15%, Employment 10%.
 * Configurable object (can be tuned or loaded from env/config).
 */
export const DEFAULT_DIMENSION_WEIGHTS: Record<RiskDimensionKey, number> = {
  legal: 0.30,
  financial: 0.25,
  litigation: 0.20,
  privacy: 0.15,
  employment: 0.10,
};

/**
 * Shared clause_type -> dimension(s) mapping table.
 * Shared across the entire team (Krina, Shalvi, Rishi).
 */
export const CLAUSE_DIMENSION_MAPPING: Record<string, RiskDimensionKey[]> = {
  payment_terms: ['financial'],
  payment: ['financial'],
  indemnity: ['financial', 'legal'],
  indemnification: ['financial', 'legal'],
  termination: ['legal', 'employment'],
  liability: ['legal', 'litigation'],
  confidentiality: ['privacy'],
  non_compete: ['employment'],
  dispute_resolution: ['litigation'],
  arbitration: ['litigation'],
  data_sharing: ['privacy'],
  compensation: ['financial', 'employment'],
  breach_conditions: ['legal', 'litigation'],
  governing_law: ['legal'],
  intellectual_property: ['legal'],
  warranty: ['legal'],
  force_majeure: ['legal'],
  assignment: ['legal'],
  entire_agreement: ['legal'],
  other: ['legal'],
};

/**
 * Calculate per-clause dimension contributions based on risk_score and clause_type mapping.
 */
export function calculateClauseDimensionContributions(clauseType: string, riskScore: number): Partial<RiskDimensions> {
  const targetDimensions = CLAUSE_DIMENSION_MAPPING[clauseType.toLowerCase()] || ['legal'];
  const contributions: Partial<RiskDimensions> = {};

  for (const dim of targetDimensions) {
    contributions[dim] = Math.min(100, Math.max(0, riskScore));
  }

  return contributions;
}

/**
 * Calculate per-contract aggregated risk_dimensions (0-100 score for each dimension).
 * Uses Rishi's dimension_scores if present; otherwise calculates from clause mapping.
 */
export function calculateAggregatedRiskDimensions(
  clauses: Array<{ clause_type: string; risk_score: number; dimension_scores?: any }>
): RiskDimensions {
  const dimensionTotals: Record<RiskDimensionKey, { sum: number; count: number }> = {
    financial: { sum: 0, count: 0 },
    legal: { sum: 0, count: 0 },
    privacy: { sum: 0, count: 0 },
    employment: { sum: 0, count: 0 },
    litigation: { sum: 0, count: 0 },
  };

  for (const clause of clauses) {
    // TODO: Switch to Rishi's live per-clause dimension_scores when AI service endpoint is confirmed
    const contribs = clause.dimension_scores || calculateClauseDimensionContributions(clause.clause_type, clause.risk_score);

    for (const [key, val] of Object.entries(contribs)) {
      const dimKey = key as RiskDimensionKey;
      if (dimensionTotals[dimKey] !== undefined && typeof val === 'number') {
        dimensionTotals[dimKey].sum += val;
        dimensionTotals[dimKey].count += 1;
      }
    }
  }

  const result: RiskDimensions = {
    financial: 0,
    legal: 0,
    privacy: 0,
    employment: 0,
    litigation: 0,
  };

  for (const dim of Object.keys(dimensionTotals) as RiskDimensionKey[]) {
    const { sum, count } = dimensionTotals[dim];
    result[dim] = count > 0 ? Math.round(sum / count) : 0;
  }

  return result;
}

/**
 * Calculate weighted overall risk score (0-100) using configurable dimension weights.
 */
export function calculateWeightedOverallRiskScore(
  dimensions: RiskDimensions,
  weights: Record<RiskDimensionKey, number> = DEFAULT_DIMENSION_WEIGHTS
): number {
  let weightedSum = 0;
  let weightTotal = 0;

  for (const dim of Object.keys(weights) as RiskDimensionKey[]) {
    const score = dimensions[dim] || 0;
    const weight = weights[dim] || 0;
    weightedSum += score * weight;
    weightTotal += weight;
  }

  if (weightTotal === 0) return 0;
  return Math.min(100, Math.max(0, Math.round(weightedSum / weightTotal)));
}
