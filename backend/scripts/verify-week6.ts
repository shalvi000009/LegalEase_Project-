process.env.MOCK_SERVICES = "true";
import app from "../src/app";
import { swaggerSpec } from "../src/config/swagger";
import { prisma } from "../src/config/db";
import { processPendingReminders } from "../src/services/reminder.worker";

async function runVerification() {
  console.log("==========================================");
  console.log("🧪 Starting LegalEase Week 6 Verification Pass");
  console.log("==========================================");

  let failures: string[] = [];

  // 1. Verify Express App Initialization
  if (!app) {
    failures.push("Express app failed to initialize");
  } else {
    console.log("✅ 1. Express application initialized successfully");
  }

  // 2. Verify OpenAPI / Swagger Routes Registration
  const specAny = swaggerSpec as any;
  const paths = Object.keys(specAny.paths || {});
  console.log("🔍 Registered Swagger Paths:", paths);

  const requiredPaths = [
    "/api/v1/documents/{id}/dates",
    "/api/v1/reminders",
    "/api/v1/reminders/{id}/snooze",
  ];

  for (const path of requiredPaths) {
    if (!paths.includes(path)) {
      failures.push(`Swagger spec missing required path: ${path}`);
    }
  }

  if (failures.length === 0) {
    console.log("✅ 2. All Week 6 date & reminder endpoints present in Swagger spec");
  }

  // 3. Start live test HTTP server
  const server = app.listen(0, async () => {
    const address = server.address() as any;
    const baseUrl = `http://localhost:${address.port}`;

    try {
      // 4. Register test user
      const registerRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Verify Week 6 User",
          email: `verify.week6.${Date.now()}@example.com`,
          password: "Password123!",
        }),
      });
      const registerData = await registerRes.json();
      const accessToken = registerData.tokens?.accessToken;
      if (registerRes.status === 201 && accessToken) {
        console.log("✅ 3. User registered successfully and received auth token");
      } else {
        failures.push(`User registration failed: status ${registerRes.status}`);
        return;
      }

      // 5. Upload document
      const formData = new FormData();
      const blob = new Blob(["%PDF-1.5 test agreement"], { type: "application/pdf" });
      formData.append("file", blob, "service_agreement_week6.pdf");

      const uploadRes = await fetch(`${baseUrl}/api/v1/documents`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      const uploadedDocId = uploadData.document?.id;
      if (uploadRes.status === 201 && uploadedDocId) {
        console.log(`✅ 4. Document uploaded successfully (ID: ${uploadedDocId})`);
      } else {
        failures.push(`Document upload failed: status ${uploadRes.status}`);
        return;
      }

      // 6. Create contract date with reminders (POST /api/v1/documents/{id}/dates)
      const expiryDateISO = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const createDateRes = await fetch(`${baseUrl}/api/v1/documents/${uploadedDocId}/dates`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date_type: "expiry_date",
          raw_text: "Section 8: Agreement expires in 30 days.",
          resolved_date: expiryDateISO,
          confidence: 0.98,
          user_confirmed: true,
          reminders: [
            { days_before: 30, channel: "email" },
            { days_before: 7, channel: "email" },
          ],
        }),
      });

      const createDateData = await createDateRes.json();
      if (createDateRes.status === 201 && createDateData.id && Array.isArray(createDateData.reminders)) {
        console.log(`✅ 5. Contract date created successfully with ${createDateData.reminders.length} scheduled reminders`);
      } else {
        failures.push(`Create date failed: status ${createDateRes.status}, data: ${JSON.stringify(createDateData)}`);
      }

      // 7. Retrieve dates for document (GET /api/v1/documents/{id}/dates)
      const getDatesRes = await fetch(`${baseUrl}/api/v1/documents/${uploadedDocId}/dates`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      const getDatesData = await getDatesRes.json();
      if (getDatesRes.status === 200 && Array.isArray(getDatesData.dates) && getDatesData.dates.length > 0) {
        console.log(`✅ 6. GET /api/v1/documents/{id}/dates returned ${getDatesData.dates.length} contract date(s)`);
      } else {
        failures.push(`GET contract dates failed: status ${getDatesRes.status}`);
      }

      // 8. Retrieve user reminders (GET /api/v1/reminders)
      const getRemindersRes = await fetch(`${baseUrl}/api/v1/reminders`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      const getRemindersData = await getRemindersRes.json();
      let reminderToSnoozeId = "";
      if (getRemindersRes.status === 200 && Array.isArray(getRemindersData.reminders) && getRemindersData.reminders.length > 0) {
        reminderToSnoozeId = getRemindersData.reminders[0].id;
        console.log(`✅ 7. GET /api/v1/reminders returned ${getRemindersData.reminders.length} reminder(s)`);
      } else {
        failures.push(`GET reminders failed: status ${getRemindersRes.status}`);
      }

      // 9. Snooze reminder (PATCH /api/v1/reminders/{id}/snooze)
      if (reminderToSnoozeId) {
        const snoozeRes = await fetch(`${baseUrl}/api/v1/reminders/${reminderToSnoozeId}/snooze`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            snooze_days: 14,
          }),
        });
        const snoozeData = await snoozeRes.json();
        if (snoozeRes.status === 200 && snoozeData.status === "snoozed" && snoozeData.snoozed_until) {
          console.log(`✅ 8. Reminder snoozed successfully until ${snoozeData.snoozed_until}`);
        } else {
          failures.push(`Snooze reminder failed: status ${snoozeRes.status}, data: ${JSON.stringify(snoozeData)}`);
        }
      }

      // 10. Test processPendingReminders worker function
      const workerResult = await processPendingReminders();
      console.log(`✅ 9. Reminder background worker executed: ${JSON.stringify(workerResult)}`);

    } catch (err: any) {
      failures.push(`Execution error during verification: ${err.message}`);
    } finally {
      server.close();
      await prisma.$disconnect();
    }

    console.log("==========================================");
    if (failures.length > 0) {
      console.error("❌ Verification FAILED with issues:");
      failures.forEach((f) => console.error(` - ${f}`));
      process.exitCode = 1;
    } else {
      console.log("🏆 WEEK 6 DATE EXTRACTION & REMINDER CORE VERIFICATION SUCCESSFUL!");
      process.exitCode = 0;
    }
  });
}

runVerification();
