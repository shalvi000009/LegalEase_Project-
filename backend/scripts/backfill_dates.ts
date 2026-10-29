import { prisma } from "../src/config/db";
import { saveContractDatesAndReminders } from "../src/services/contractDate.service";

async function runBackfill() {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
  console.log("=== STARTING CONTRACT DATES BACKFILL ===");
  console.log(`Connecting to AI service at ${AI_SERVICE_URL}...`);

  const documents = await prisma.document.findMany({
    where: {
      status: "done",
    },
    include: {
      user: true,
      contract_dates: true,
    },
  });

  console.log(`Found ${documents.length} analyzed documents across all users to backfill.\n`);

  let updatedCount = 0;
  let datesCreatedCount = 0;
  let remindersCreatedCount = 0;

  for (const doc of documents) {
    console.log(`Processing doc [${doc.id}] - "${doc.filename}" (User: ${doc.user?.email || doc.user_id})...`);
    try {
      const response = await fetch(`${AI_SERVICE_URL}/internal/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: doc.id,
          s3_key: doc.s3_key,
        }),
      });

      if (!response.ok) {
        console.warn(`  x AI Service returned status ${response.status} for ${doc.id}`);
        continue;
      }

      const data: any = await response.json();
      const contractDates = data.contract_dates;

      if (contractDates) {
        console.log(`  -> Extracted: Effective: ${contractDates.effective_date || "none"} | Expiry: ${contractDates.expiry_date || "none"} | Auto-renews: ${contractDates.auto_renews} | Notice: ${contractDates.notice_period_days || "none"}d`);
        await saveContractDatesAndReminders(doc.id, doc.user_id, contractDates, "extracted");
        updatedCount++;
      } else {
        console.log(`  -> No dates detected by AI pipeline for ${doc.filename}.`);
      }
    } catch (err: any) {
      console.error(`  x Error backfilling doc ${doc.id}:`, err?.message || err);
    }
  }

  // Recount in database
  const totalDates = await prisma.contractDate.count();
  const totalReminders = await prisma.reminder.count();

  console.log("\n========================================");
  console.log("=== CONTRACT DATES BACKFILL COMPLETE ===");
  console.log(`Documents processed: ${documents.length}`);
  console.log(`Documents updated with dates: ${updatedCount}`);
  console.log(`Total contract_dates in DB: ${totalDates}`);
  console.log(`Total reminders in DB: ${totalReminders}`);
  console.log("========================================\n");
}

runBackfill()
  .catch((e) => {
    console.error("Backfill fatal error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

