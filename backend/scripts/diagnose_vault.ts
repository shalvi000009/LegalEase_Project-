import { prisma } from "../src/config/db";

async function diagnose() {
  console.log("=== DIAGNOSE VAULT & DATES ===");
  
  // 1. Look for the documents mentioned in the prompt
  const targetIds = ["084fe6a6-b47a-4e3c-bb5c-7e93a6cb762a", "81c4b8ea-725f-4f6a-9de6-eed323c1ad65"];
  const targetDocs = await prisma.document.findMany({
    where: { id: { in: targetIds } },
    include: {
      user: true,
      analyses: { select: { id: true, overall_risk_score: true } },
      contract_dates: true,
    },
  });

  console.log(`Found ${targetDocs.length} matching target documents:`);
  for (const doc of targetDocs) {
    console.log(`- Doc ID: ${doc.id}`);
    console.log(`  Filename: ${doc.filename}`);
    console.log(`  Status: ${doc.status}`);
    console.log(`  User: ${doc.user?.email} (${doc.user?.id})`);
    console.log(`  Analyses: ${doc.analyses.length}`);
    console.log(`  Contract Dates: ${doc.contract_dates.length}`);
  }

  // 2. Identify the user
  let userId = targetDocs[0]?.user_id;
  if (!userId) {
    const firstUser = await prisma.user.findFirst();
    userId = firstUser?.id || "";
    console.log(`Using first user in DB: ${firstUser?.email} (${userId})`);
  } else {
    console.log(`Target User ID: ${userId}`);
  }

  // 3. Count documents, contract_dates, and reminders for this user
  const userDocs = await prisma.document.findMany({
    where: { user_id: userId },
    select: { id: true, filename: true, status: true, created_at: true },
  });
  console.log(`\nUser total documents: ${userDocs.length}`);
  for (const d of userDocs) {
    console.log(`  * ${d.id} | ${d.filename} | status: ${d.status}`);
  }

  const userContractDates = await prisma.contractDate.findMany({
    where: { document: { user_id: userId } },
    include: { reminders: true },
  });
  console.log(`\nUser total contract_dates: ${userContractDates.length}`);
  for (const cd of userContractDates) {
    console.log(`  * ${cd.id} | type: ${cd.date_type} | resolved: ${cd.resolved_date} | reminders: ${cd.reminders.length}`);
  }

  const userReminders = await prisma.reminder.findMany({
    where: { user_id: userId },
  });
  console.log(`\nUser total reminders: ${userReminders.length}`);

  // 4. Check total across all users in DB
  const totalAllDates = await prisma.contractDate.count();
  const totalAllReminders = await prisma.reminder.count();
  console.log(`\nTotal contract_dates in entire DB: ${totalAllDates}`);
  console.log(`Total reminders in entire DB: ${totalAllReminders}`);
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

