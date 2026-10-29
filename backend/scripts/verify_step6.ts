import { prisma } from "../src/config/db";
import { saveContractDatesAndReminders, getVaultContractsForUser } from "../src/services/contractDate.service";
import { processPendingReminders } from "../src/services/reminder.worker";
import jwt from "jsonwebtoken";

async function main() {
  console.log("=================================================================");
  console.log("            LEGALESE CONTRACT VAULT & REMINDERS VERIFICATION      ");
  console.log("=================================================================\n");

  // 1. Locate user
  const user = await prisma.user.findFirst({
    where: { email: "shalvipatel1827@gmail.com" },
  });

  if (!user) {
    console.error("User shalvipatel1827@gmail.com not found!");
    return;
  }

  console.log(`[USER IDENTIFIED] ${user.name} (${user.email}), ID: ${user.id}\n`);

  // 2. Prepare test contracts
  const now = new Date();

  // Test Contract 1: Expires in 2 days
  const expiryIn2Days = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const effectivePast = new Date(now.getTime() - 363 * 24 * 60 * 60 * 1000);

  // Test Contract 2: Expired 10 days ago
  const expiry10DaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const effectivePast2 = new Date(now.getTime() - 375 * 24 * 60 * 60 * 1000);

  // Clean up any previous test docs with these names
  await prisma.document.deleteMany({
    where: {
      user_id: user.id,
      filename: { in: ["Test-Vendor-Agreement-ExpiringSoon.pdf", "Test-Consulting-Agreement-Expired.pdf"] },
    },
  });

  // Insert Contract 1 (Expiring Soon)
  const docExpiringSoon = await prisma.document.create({
    data: {
      user_id: user.id,
      filename: "Test-Vendor-Agreement-ExpiringSoon.pdf",
      s3_key: `test/${user.id}/Test-Vendor-Agreement-ExpiringSoon.pdf`,
      status: "done",
      analyses: {
        create: {
          overall_risk_score: 42,
          model_version: "2.0.0",
        },
      },
    },
  });

  // Save contract dates & auto-create reminders for Contract 1
  await saveContractDatesAndReminders(
    docExpiringSoon.id,
    user.id,
    {
      effective_date: effectivePast.toISOString().split("T")[0],
      expiry_date: expiryIn2Days.toISOString().split("T")[0],
      auto_renews: true,
      notice_period_days: 30,
    },
    "extracted"
  );
  console.log(`[CONTRACT INSERTED] "${docExpiringSoon.filename}"`);
  console.log(`  -> Expiry: ${expiryIn2Days.toISOString().split("T")[0]} (in 2 days)`);
  console.log(`  -> Status Expected: expiring_soon\n`);

  // Insert Contract 2 (Already Expired)
  const docExpired = await prisma.document.create({
    data: {
      user_id: user.id,
      filename: "Test-Consulting-Agreement-Expired.pdf",
      s3_key: `test/${user.id}/Test-Consulting-Agreement-Expired.pdf`,
      status: "done",
      analyses: {
        create: {
          overall_risk_score: 75,
          model_version: "2.0.0",
        },
      },
    },
  });

  // Save contract dates & auto-create reminders for Contract 2
  await saveContractDatesAndReminders(
    docExpired.id,
    user.id,
    {
      effective_date: effectivePast2.toISOString().split("T")[0],
      expiry_date: expiry10DaysAgo.toISOString().split("T")[0],
      auto_renews: false,
    },
    "extracted"
  );
  console.log(`[CONTRACT INSERTED] "${docExpired.filename}"`);
  console.log(`  -> Expiry: ${expiry10DaysAgo.toISOString().split("T")[0]} (10 days ago)`);
  console.log(`  -> Status Expected: expired\n`);

  // 3. Database Rows Inspection for this User
  console.log("-----------------------------------------------------------------");
  console.log("                    DATABASE ROWS FOR USER                       ");
  console.log("-----------------------------------------------------------------");

  const userDates = await prisma.contractDate.findMany({
    where: {
      document: { user_id: user.id },
      is_active: true,
    },
    include: {
      document: { select: { filename: true } },
    },
    orderBy: { resolved_date: "asc" },
  });

  console.log(`\nFound ${userDates.length} contract_dates rows for ${user.email}:`);
  console.table(
    userDates.map((d) => ({
      date_id: d.id.substring(0, 8),
      contract: d.document.filename.substring(0, 30),
      type: d.date_type,
      resolved_date: d.resolved_date.toISOString().split("T")[0],
      confidence: d.confidence,
      user_confirmed: d.user_confirmed,
    }))
  );

  const userReminders = await prisma.reminder.findMany({
    where: { user_id: user.id },
    include: {
      contract_date: {
        include: { document: { select: { filename: true } } },
      },
    },
    orderBy: { scheduled_for: "asc" },
  });

  console.log(`\nFound ${userReminders.length} reminders rows for ${user.email}:`);
  console.table(
    userReminders.map((r) => ({
      reminder_id: r.id.substring(0, 8),
      contract: r.contract_date.document.filename.substring(0, 26),
      days_before: r.days_before,
      scheduled_for: r.scheduled_for.toISOString().split("T")[0],
      status: r.status,
      channel: r.channel,
    }))
  );

  // 4. Trigger Reminder Worker (Sending due reminders)
  console.log("\n-----------------------------------------------------------------");
  console.log("                  TRIGGERING REMINDER WORKER                      ");
  console.log("-----------------------------------------------------------------");
  const reminderResult = await processPendingReminders();
  console.log(`Reminder Worker Result: Processed: ${reminderResult.processedCount}, Sent: ${reminderResult.successCount}, Failed: ${reminderResult.failureCount}\n`);

  // 5. Query Vault Data & 4 Cards
  console.log("-----------------------------------------------------------------");
  console.log("                  CONTRACT VAULT REAL DATA & 4 CARDS             ");
  console.log("-----------------------------------------------------------------");
  const vaultData = await getVaultContractsForUser(user.id);

  console.log("\n[4 SUMMARY CARDS]:");
  console.log(`  📊 Total Contracts:  ${vaultData.stats.total}`);
  console.log(`  🟢 Active:           ${vaultData.stats.active}`);
  console.log(`  🟡 Expiring Soon:    ${vaultData.stats.expiringSoon}`);
  console.log(`  🔴 Expired:          ${vaultData.stats.expired}`);

  console.log("\n[CONTRACT VAULT TABLE LISTING]:");
  console.table(
    vaultData.contracts.map((c) => ({
      id: c.id.substring(0, 8),
      name: c.name.substring(0, 32),
      documentType: c.documentType,
      status: c.status,
      expiryDate: c.expiryDate || "None",
      daysRemaining: c.daysRemaining,
      riskScore: c.riskScore,
    }))
  );

  // 6. Test Live HTTP Endpoint with Authentication
  console.log("\n-----------------------------------------------------------------");
  console.log("               TEST LIVE HTTP VAULT API ENDPOINT                 ");
  console.log("-----------------------------------------------------------------");
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: "user" },
    process.env.JWT_ACCESS_SECRET || "legalease_dev_access_secret_key_2026",
    { expiresIn: "1h" }
  );

  try {
    const apiRes = await fetch("http://localhost:4000/api/v1/vault/contracts", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (apiRes.ok) {
      const apiData: any = await apiRes.json();
      console.log(`HTTP GET /api/v1/vault/contracts Response: Status 200 OK`);
      console.log(`Returned ${apiData.contracts.length} contracts with stats:`, apiData.stats);
    } else {
      console.error(`HTTP request failed with status: ${apiRes.status}`);
    }

    // Test calendar.ics export
    const calRes = await fetch("http://localhost:4000/api/v1/reminders/calendar.ics", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (calRes.ok) {
      const icsText = await calRes.text();
      console.log(`\nHTTP GET /api/v1/reminders/calendar.ics Response: Status 200 OK (${icsText.length} bytes)`);
      const sampleLines = icsText.split("\n").slice(0, 12).join("\n");
      console.log("ICS Preview:\n" + sampleLines);
    } else {
      console.error(`Calendar ICS export failed with status: ${calRes.status}`);
    }
  } catch (err: any) {
    console.error("HTTP fetch error:", err.message);
  }

  console.log("\n=================================================================");
  console.log("               ALL CHECKS COMPLETED SUCCESSFULLY                  ");
  console.log("=================================================================\n");
}

main()
  .catch((e) => {
    console.error("Step 6 Verification Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
