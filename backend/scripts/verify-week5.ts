process.env.MOCK_SERVICES = "true";
import app from "../src/app";
import { swaggerSpec } from "../src/config/swagger";
import { prisma } from "../src/config/db";

async function runVerification() {
  console.log("==========================================");
  console.log("🧪 Starting LegalEase Week 5 Verification Pass");
  console.log("==========================================");

  let failures: string[] = [];

  // 1. Verify App Initialization
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
    "/api/v1/documents/{id}/report",
    "/api/v1/documents/{id}/share",
    "/api/v1/share/{token}",
  ];

  for (const path of requiredPaths) {
    if (!paths.includes(path)) {
      failures.push(`Swagger spec missing required path: ${path}`);
    }
  }

  if (failures.length === 0) {
    console.log("✅ 2. All 3 new endpoints present in Swagger OpenAPI spec");
  }

  // 3. Test HTTP Server endpoints using live test server
  const server = app.listen(0, async () => {
    const address = server.address() as any;
    const baseUrl = `http://localhost:${address.port}`;

    try {
      // 4. Register a test user
      const registerRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Verify Week 5 User",
          email: `verify.week5.${Date.now()}@example.com`,
          password: "Password123!",
        }),
      });
      const registerData = await registerRes.json();
      const accessToken = registerData.tokens?.accessToken;
      if (registerRes.status === 201 && accessToken) {
        console.log("✅ 3. User registered successfully and received authorization token");
      } else {
        failures.push(`User registration failed: status ${registerRes.status}`);
        return;
      }

      // 5. Upload a mock document to generate analysis for
      const formData = new FormData();
      const blob = new Blob(["%PDF-1.5 dummy content"], { type: "application/pdf" });
      formData.append("file", blob, "test_week5_contract.pdf");

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
        console.log(`✅ 4. Document uploaded successfully, received ID: ${uploadedDocId}`);
      } else {
        failures.push(`Document upload failed: status ${uploadRes.status}`);
        return;
      }

      // 6. Wait a moment for background mock worker to create analysis
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // 7. Verify analysis exists in database
      const analysisCheck = await prisma.analysis.findFirst({
        where: { document_id: uploadedDocId },
      });
      if (!analysisCheck) {
        failures.push("Background analysis record was not created by the mock worker");
        return;
      } else {
        console.log("✅ 5. Mock background worker completed analysis successfully");
      }

      // 8. Generate Share Link (POST /api/v1/documents/:id/share)
      const shareLinkRes = await fetch(`${baseUrl}/api/v1/documents/${uploadedDocId}/share`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      const shareLinkData = await shareLinkRes.json();
      if (shareLinkRes.status === 200 && shareLinkData.shareLink) {
        console.log(`✅ 6. Share link generated successfully: ${shareLinkData.shareLink}`);
      } else {
        failures.push(`Share link generation failed: status ${shareLinkRes.status}`);
        return;
      }

      // Extract token from link
      const token = shareLinkData.shareLink.split("/").pop();

      // 9. Fetch shared analysis read-only (GET /api/v1/share/:token) - NO authorization header
      const sharedFetchRes = await fetch(`${baseUrl}/api/v1/share/${token}`);
      const sharedFetchData = await sharedFetchRes.json();
      if (
        sharedFetchRes.status === 200 &&
        sharedFetchData.document_id === uploadedDocId &&
        Array.isArray(sharedFetchData.clauses)
      ) {
        console.log("✅ 7. Shared read-only analysis fetched successfully without credentials");
      } else {
        failures.push(`Shared analysis fetch failed: status ${sharedFetchRes.status}, data: ${JSON.stringify(sharedFetchData)}`);
      }

      // 10. Download PDF report (GET /api/v1/documents/:id/report)
      const reportRes = await fetch(`${baseUrl}/api/v1/documents/${uploadedDocId}/report`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (reportRes.status === 200) {
        const contentType = reportRes.headers.get("Content-Type");
        const arrayBuffer = await reportRes.arrayBuffer();
        const bufferLength = arrayBuffer.byteLength;
        
        if (contentType === "application/pdf" && bufferLength > 0) {
          console.log(`✅ 8. PDF report downloaded successfully (${bufferLength} bytes, type: ${contentType})`);
        } else {
          failures.push(`PDF report data invalid: type=${contentType}, length=${bufferLength}`);
        }
      } else {
        failures.push(`PDF report download failed: status ${reportRes.status}`);
      }

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
      console.log("🏆 WEEK 5 REPORTING & SHARING VERIFICATION SUCCESSFUL!");
      process.exitCode = 0;
    }
  });
}

runVerification();
