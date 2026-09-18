process.env.MOCK_SERVICES = "true";
import app from "../src/app";
import { swaggerSpec } from "../src/config/swagger";
import { prisma } from "../src/config/db";
import { processPendingReminders } from "../src/services/reminder.worker";

async function runVerification() {
  console.log("==========================================");
  console.log("🧪 Starting LegalEase Week 7 Verification Pass");
  console.log("==========================================");

  let failures: string[] = [];

  // 1. Verify Express Application
  if (!app) {
    failures.push("Express app failed to initialize");
  } else {
    console.log("✅ 1. Express application initialized successfully");
  }

  // 2. Verify Swagger OpenAPI Spec Registration
  const specAny = swaggerSpec as any;
  const paths = Object.keys(specAny.paths || {});
  console.log("🔍 Registered Swagger Paths:", paths);

  const requiredPaths = [
    "/api/v1/notification-preferences",
    "/api/v1/reminders/calendar.ics",
  ];

  for (const path of requiredPaths) {
    if (!paths.includes(path)) {
      failures.push(`Swagger spec missing required path: ${path}`);
    }
  }

  if (failures.length === 0) {
    console.log("✅ 2. Week 7 notification preferences & iCal endpoints present in Swagger spec");
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
          name: "Verify Week 7 User",
          email: `verify.week7.${Date.now()}@example.com`,
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

      // 5. Get default notification preferences (GET /api/v1/notification-preferences)
      const getPrefsRes = await fetch(`${baseUrl}/api/v1/notification-preferences`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      const getPrefsData = await getPrefsRes.json();
      if (getPrefsRes.status === 200 && getPrefsData.email_enabled === true) {
        console.log("✅ 4. Default notification preferences fetched successfully");
      } else {
        failures.push(`GET notification preferences failed: status ${getPrefsRes.status}`);
      }

      // 6. Update notification preferences & register FCM token (POST /api/v1/notification-preferences)
      const postPrefsRes = await fetch(`${baseUrl}/api/v1/notification-preferences`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_enabled: true,
          push_enabled: true,
          sms_enabled: true,
          phone_number: "+15559876543",
          fcm_token: "fcm_token_sample_abc123_xyz",
          reminder_days: [30, 7, 1],
          rescan_notify: true,
        }),
      });
      const postPrefsData = await postPrefsRes.json();
      if (
        postPrefsRes.status === 200 &&
        postPrefsData.push_enabled === true &&
        postPrefsData.fcm_token === "fcm_token_sample_abc123_xyz"
      ) {
        console.log("✅ 5. Updated notification preferences & registered FCM push token successfully");
      } else {
        failures.push(`POST notification preferences failed: status ${postPrefsRes.status}, data: ${JSON.stringify(postPrefsData)}`);
      }

      // 7. Upload document
      const formData = new FormData();
      const blob = new Blob(["%PDF-1.5 test agreement week 7"], { type: "application/pdf" });
      formData.append("file", blob, "master_services_agreement.pdf");

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
        console.log(`✅ 6. Document uploaded successfully (ID: ${uploadedDocId})`);
      } else {
        failures.push(`Document upload failed: status ${uploadRes.status}`);
        return;
      }

      // 8. Create contract date with multi-channel reminders (push, sms, email)
      const expiryDateISO = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const createDateRes = await fetch(`${baseUrl}/api/v1/documents/${uploadedDocId}/dates`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date_type: "renewal_date",
          raw_text: "Clause 14: Auto-renews unless notice provided 30 days prior.",
          resolved_date: expiryDateISO,
          confidence: 0.96,
          user_confirmed: true,
          reminders: [
            { days_before: 30, channel: "email" },
            { days_before: 7, channel: "push" },
            { days_before: 1, channel: "sms" },
          ],
        }),
      });
      const createDateData = await createDateRes.json();
      if (createDateRes.status === 201 && Array.isArray(createDateData.reminders)) {
        console.log(`✅ 7. Contract date created with ${createDateData.reminders.length} multi-channel reminders (email, push, sms)`);
      } else {
        failures.push(`Create date failed: status ${createDateRes.status}`);
      }

      // 9. Export iCal calendar feed (GET /api/v1/reminders/calendar.ics)
      const icsRes = await fetch(`${baseUrl}/api/v1/reminders/calendar.ics`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      const icsText = await icsRes.text();
      const contentType = icsRes.headers.get("Content-Type");
      if (
        icsRes.status === 200 &&
        contentType?.includes("text/calendar") &&
        icsText.includes("BEGIN:VCALENDAR") &&
        icsText.includes("BEGIN:VEVENT")
      ) {
        console.log("✅ 8. RFC 5545 iCalendar (.ics) feed exported successfully");
      } else {
        failures.push(`iCal feed failed: status ${icsRes.status}, type: ${contentType}, length: ${icsText.length}`);
      }

      // 10. Execute multi-channel reminder worker
      const workerResult = await processPendingReminders();
      console.log(`✅ 9. Multi-channel reminder worker executed cleanly: ${JSON.stringify(workerResult)}`);

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
      console.log("🏆 WEEK 7 MULTI-CHANNEL NOTIFICATIONS VERIFICATION SUCCESSFUL!");
      process.exitCode = 0;
    }
  });
}

runVerification();
