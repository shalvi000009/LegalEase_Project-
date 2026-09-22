import {
  calculateClauseDimensionContributions,
  calculateAggregatedRiskDimensions,
  calculateWeightedOverallRiskScore,
  DEFAULT_DIMENSION_WEIGHTS,
} from '../config/riskWeights';

describe('Week 10 Multi-Dimensional Risk Analysis Unit Tests', () => {
  it('should calculate per-clause dimension contributions based on mapping', () => {
    const liabilityContribs = calculateClauseDimensionContributions('liability', 90);
    expect(liabilityContribs).toEqual({ legal: 90, litigation: 90 });

    const confidentialityContribs = calculateClauseDimensionContributions('confidentiality', 40);
    expect(confidentialityContribs).toEqual({ privacy: 40 });

    const indemnityContribs = calculateClauseDimensionContributions('indemnification', 70);
    expect(indemnityContribs).toEqual({ financial: 70, legal: 70 });
  });

  it('should aggregate contract risk dimensions across clauses', () => {
    const clauses = [
      { clause_type: 'liability', risk_score: 90 },
      { clause_type: 'confidentiality', risk_score: 20 },
      { clause_type: 'termination', risk_score: 50 },
      { clause_type: 'payment_terms', risk_score: 80 },
    ];

    const dimensions = calculateAggregatedRiskDimensions(clauses);
    expect(dimensions.financial).toBe(80);
    expect(dimensions.legal).toBe(70); // avg of liability (90) + termination (50)
    expect(dimensions.privacy).toBe(20);
    expect(dimensions.employment).toBe(50);
    expect(dimensions.litigation).toBe(90);
  });

  it('should calculate weighted overall risk score correctly', () => {
    const dimensions = {
      legal: 70,       // weight 0.30 -> 21
      financial: 80,   // weight 0.25 -> 20
      litigation: 90,  // weight 0.20 -> 18
      privacy: 20,     // weight 0.15 -> 3
      employment: 50,  // weight 0.10 -> 5
    };

    const weightedScore = calculateWeightedOverallRiskScore(dimensions, DEFAULT_DIMENSION_WEIGHTS);
    // (21 + 20 + 18 + 3 + 5) / 1.0 = 67
    expect(weightedScore).toBe(67);
  });
});
