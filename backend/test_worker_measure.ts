import { prisma } from "./src/config/db";
import { processDocumentJobReal } from "./src/config/queue";

async function main() {
  console.log("Starting test document worker execution...");
  // Find or create test user
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "test_timing@example.com",
        name: "Test Timing User",
        password_hash: "hash",
      },
    });
  }

  // Create document
  const doc = await prisma.document.create({
    data: {
      user_id: user.id,
      filename: "sample_contract.pdf",
      s3_key: "sample_contract.pdf",
      status: "uploaded",
    },
  });

  console.log(`Created document ${doc.id}, executing worker...`);
  const t0 = performance.now();
  await processDocumentJobReal(doc.id, doc.s3_key);
  const total = performance.now() - t0;
  console.log(`[MEASUREMENT COMPLETED] Full worker execution took: ${total.toFixed(1)} ms`);

  const updated = await prisma.document.findUnique({
    where: { id: doc.id },
    include: { analyses: { include: { clauses: true } } },
  });
  console.log(`Document status: ${updated?.status}`);
  console.log(`Analyses count: ${updated?.analyses.length}`);
  console.log(`Clauses extracted: ${updated?.analyses[0]?.clauses.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

