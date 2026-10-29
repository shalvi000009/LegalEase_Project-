const VALID_PRISMA_CLAUSE_TYPES = new Set([
  "liability",
  "termination",
  "indemnification",
  "governing_law",
  "confidentiality",
  "intellectual_property",
  "non_compete",
  "payment",
  "warranty",
  "force_majeure",
  "assignment",
  "entire_agreement",
]);

const CLAUSE_TYPE_MAP: Record<string, string> = {
  liability_limitation: "liability",
  limitation_of_liability: "liability",
  payment_terms: "payment",
  ip_ownership: "intellectual_property",
  arbitration: "governing_law",
  auto_renewal: "termination",
  data_privacy: "confidentiality",
  severability: "entire_agreement",
  other: "entire_agreement",
};

export function toValidClauseType(raw: string): any {
  const normalized = (raw || "").toLowerCase().trim();
  if (VALID_PRISMA_CLAUSE_TYPES.has(normalized)) {
    return normalized;
  }
  return CLAUSE_TYPE_MAP[normalized] || "entire_agreement";
}

const VALID_RISK_LEVELS = new Set(["low", "medium", "high"]);
export function toValidRiskLevel(raw: string): any {
  const normalized = (raw || "").toLowerCase().trim();
  if (VALID_RISK_LEVELS.has(normalized)) {
    return normalized;
  }
  return "medium";
}
