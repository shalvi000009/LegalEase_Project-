-- AlterTable
ALTER TABLE "analyses" ADD COLUMN "risk_dimensions" JSONB;

-- AlterTable
ALTER TABLE "clauses" ADD COLUMN "dimension_contributions" JSONB;
