import app from "../src/app";
import { swaggerSpec } from "../src/config/swagger";
import { prisma } from "../src/config/db";

async function runVerification() {
  console.log("==========================================");
  console.log("🧪 Starting LegalEase Week 3 Verification Pass");
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

  const requiredPath = "/api/v1/documents/{id}/analysis";
  if (!paths.includes(requiredPath)) {
    failures.push(`Swagger spec missing required path: ${requiredPath}`);
  } else {
    console.log("✅ 2. Week 3 analysis endpoint present in Swagger OpenAPI spec");
  }

  // 3. Test HTTP Server endpoints using live test server
  const server = app.listen(0, async () => {
    const address = server.address() as any;
    const baseUrl = `http://localhost:${address.port}`;

    try {
      // Test Auth Middleware: GET /api/v1/documents/{id}/analysis without token
      const analysisNoAuthRes = await fetch(`${baseUrl}/api/v1/documents/f47ac10b-58cc-4372-a567-0e02b2c3d479/analysis`);
      const analysisNoAuthData = await analysisNoAuthRes.json();
      if (
        analysisNoAuthRes.status === 401 &&
        analysisNoAuthData.error_code === "UNAUTHORIZED"
      ) {
        console.log("✅ 3. Auth Middleware Test: GET /api/v1/documents/{id}/analysis without token returned 401 Unauthorized");
      } else {
        failures.push(`Auth Middleware Test failed: expected 401, got ${analysisNoAuthRes.status}`);
      }

      // 4. Register a test user
      const registerRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Verify Week 3 User",
          email: `verify.week3.${Date.now()}@example.com`,
          password: "Password123!",
        }),
      });
      const registerData = await registerRes.json();
      const accessToken = registerData.tokens?.accessToken;
      if (registerRes.status === 201 && accessToken) {
        console.log("✅ 4. User registered successfully in Mock DB");
      } else {
        failures.push(`User registration failed: status ${registerRes.status}`);
        return;
      }

      // Test NotFound: GET /api/v1/documents/{id}/analysis with non-existent UUID
      const analysisNotFoundRes = await fetch(`${baseUrl}/api/v1/documents/f47ac10b-58cc-4372-a567-0e02b2c3d479/analysis`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      const analysisNotFoundData = await analysisNotFoundRes.json();
      if (
        analysisNotFoundRes.status === 404 &&
        analysisNotFoundData.error_code === "NOT_FOUND"
      ) {
        console.log("✅ 5. Not Found Test: GET /api/v1/documents/{id}/analysis with invalid UUID returned 404 Not Found");
      } else {
        failures.push(`Not Found Test failed: expected 404, got ${analysisNotFoundRes.status}`);
      }

      // 5. Upload a mock document
      const formData = new FormData();
      const blob = new Blob(["%PDF-1.5 dummy content"], { type: "application/pdf" });
      formData.append("file", blob, "test_week3_contract.pdf");

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
        console.log(`✅ 6. Document uploaded successfully, received ID: ${uploadedDocId}`);
      } else {
        failures.push(`Document upload failed: status ${uploadRes.status}`);
        return;
      }

      // Test NotReady: Get analysis immediately (it should return 400 ANALYSIS_NOT_READY)
      const analysisNotReadyRes = await fetch(`${baseUrl}/api/v1/documents/${uploadedDocId}/analysis`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      const analysisNotReadyData = await analysisNotReadyRes.json();
      if (
        analysisNotReadyRes.status === 400 &&
        analysisNotReadyData.error_code === "ANALYSIS_NOT_READY"
      ) {
        console.log("✅ 7. Analysis Not Ready Test: GET analysis immediately returned 400 ANALYSIS_NOT_READY");
      } else {
        failures.push(`Not Ready Test failed: expected 400, got ${analysisNotReadyRes.status}`);
      }

      // 6. Poll document status until it becomes "done"
      console.log("⏳ Waiting for background analysis worker to complete...");
      let attempts = 0;
      let status = "uploaded";
      while (attempts < 15) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const pollRes = await fetch(`${baseUrl}/api/v1/documents/${uploadedDocId}`, {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });
        const pollData = await pollRes.json();
        status = pollData.document?.status || "unknown";
        console.log(` - Poll Attempt ${attempts + 1}: status is "${status}"`);
        if (status === "done") {
          break;
        }
        attempts++;
      }

      if (status !== "done") {
        failures.push(`Document analysis failed to complete, final status: ${status}`);
        return;
      }
      console.log("✅ 8. Document analysis completed successfully in background");

      // 7. Request document analysis
      const analysisRes = await fetch(`${baseUrl}/api/v1/documents/${uploadedDocId}/analysis`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      const analysisData = await analysisRes.json();
      if (
        analysisRes.status === 200 &&
        analysisData.document_id === uploadedDocId &&
        typeof analysisData.overall_risk_score === "number" &&
        Array.isArray(analysisData.clauses) &&
        analysisData.clauses.length > 0
      ) {
        console.log(`✅ 9. Success: Retrieved analysis successfully!`);
        console.log(`   - Overall Risk Score: ${analysisData.overall_risk_score}`);
        console.log(`   - Model Version: ${analysisData.model_version}`);
        console.log(`   - Extracted Clauses Count: ${analysisData.clauses.length}`);
        analysisData.clauses.forEach((c: any, index: number) => {
          console.log(`     Clause ${index + 1}: [Type: ${c.clause_type}] [Risk: ${c.risk_level}] [Score: ${c.risk_score}]`);
        });
      } else {
        failures.push(`GET analysis failed: status ${analysisRes.status}, data: ${JSON.stringify(analysisData)}`);
      }

    } catch (err: any) {
      failures.push(`Execution error during verification: ${err.message}`);
    } finally {
      server.close();
      await prisma.$disconnect();
    }

    console.log("==========================================");
    if (failures.length > 0) {
      console.error("❌ Week 3 Verification FAILED with issues:");
      failures.forEach((f) => console.error(` - ${f}`));
      process.exit(1);
    } else {
      console.log("🎉 Week 3 Verification PASSED! Clause analysis & endpoints confirmed.");
      process.exit(0);
    }
  });
}

runVerification();
