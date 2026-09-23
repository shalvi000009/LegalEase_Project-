process.env.MOCK_SERVICES = "true";
import app from "../src/app";
import { swaggerSpec } from "../src/config/swagger";
import { prisma } from "../src/config/db";

async function runVerification() {
  console.log("==========================================");
  console.log("🧪 Starting LegalEase Week 2 Verification Pass");
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
    "/api/v1/documents",
    "/api/v1/documents/{id}",
  ];

  for (const path of requiredPaths) {
    if (!paths.includes(path)) {
      failures.push(`Swagger spec missing required path: ${path}`);
    }
  }

  if (failures.length === 0) {
    console.log("✅ 2. All Week 2 document endpoints present in Swagger OpenAPI spec");
  }

  // 3. Test HTTP Server endpoints using live test server
  const server = app.listen(0, async () => {
    const address = server.address() as any;
    const baseUrl = `http://localhost:${address.port}`;

    try {
      // Test GET /health
      const healthRes = await fetch(`${baseUrl}/health`);
      const healthData = await healthRes.json();
      if (healthRes.status === 200 && healthData.status === "ok") {
        console.log("✅ 3. GET /health returned 200 OK");
      } else {
        failures.push(`GET /health failed: status ${healthRes.status}`);
      }

      // Test GET /docs/openapi.json
      const openapiRes = await fetch(`${baseUrl}/docs/openapi.json`);
      const openapiData = await openapiRes.json();
      if (openapiRes.status === 200 && openapiData.openapi === "3.0.0") {
        console.log("✅ 4. GET /docs/openapi.json returned valid OpenAPI 3.0 spec");
      } else {
        failures.push(`GET /docs/openapi.json failed: status ${openapiRes.status}`);
      }

      // Test Auth Middleware: GET /api/v1/documents without token
      const listNoAuthRes = await fetch(`${baseUrl}/api/v1/documents`);
      const listNoAuthData = await listNoAuthRes.json();
      if (
        listNoAuthRes.status === 401 &&
        listNoAuthData.error_code === "UNAUTHORIZED" &&
        listNoAuthData.message === "Authentication token is missing or invalid"
      ) {
        console.log("✅ 5. Auth Middleware Test: GET /api/v1/documents without token returned 401 Unauthorized");
      } else {
        failures.push(`Auth Middleware Test failed: expected 401, got ${listNoAuthRes.status}`);
      }

      // Test Auth Middleware: GET /api/v1/documents/{id} without token
      const pollNoAuthRes = await fetch(`${baseUrl}/api/v1/documents/f47ac10b-58cc-4372-a567-0e02b2c3d479`);
      const pollNoAuthData = await pollNoAuthRes.json();
      if (
        pollNoAuthRes.status === 401 &&
        pollNoAuthData.error_code === "UNAUTHORIZED"
      ) {
        console.log("✅ 6. Auth Middleware Test: GET /api/v1/documents/{id} without token returned 401 Unauthorized");
      } else {
        failures.push(`Auth Middleware Test failed: expected 401, got ${pollNoAuthRes.status}`);
      }

      // Test Auth Middleware: POST /api/v1/documents without token
      const uploadNoAuthRes = await fetch(`${baseUrl}/api/v1/documents`, {
        method: "POST",
      });
      const uploadNoAuthData = await uploadNoAuthRes.json();
      if (
        uploadNoAuthRes.status === 401 &&
        uploadNoAuthData.error_code === "UNAUTHORIZED"
      ) {
        console.log("✅ 7. Auth Middleware Test: POST /api/v1/documents without token returned 401 Unauthorized");
      } else {
        failures.push(`Auth Middleware Test failed: expected 401, got ${uploadNoAuthRes.status}`);
      }

      // 8. Register a test user
      const registerRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Verify Week 2 User",
          email: `verify.week2.${Date.now()}@example.com`,
          password: "Password123!",
        }),
      });
      const registerData = await registerRes.json();
      if (registerRes.status === 201 && registerData.tokens?.accessToken) {
        console.log("✅ 8. Success: User registered successfully in Mock DB");
      } else {
        failures.push(`User registration failed: status ${registerRes.status}, data: ${JSON.stringify(registerData)}`);
      }

      // 9. Login as the registered user
      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerData.user?.email || "none@example.com",
          password: "Password123!",
        }),
      });
      const loginData = await loginRes.json();
      const accessToken = loginData.tokens?.accessToken;
      const refreshToken = loginData.tokens?.refreshToken;
      if (loginRes.status === 200 && accessToken) {
        console.log("✅ 9. Success: User logged in and retrieved access token");
      } else {
        failures.push(`User login failed: status ${loginRes.status}`);
      }

      // 10. Refresh the access token
      const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const refreshData = await refreshRes.json();
      const newAccessToken = refreshData.tokens?.accessToken;
      if (refreshRes.status === 200 && newAccessToken) {
        console.log("✅ 10. Success: Access token refreshed successfully");
      } else {
        failures.push(`Token refresh failed: status ${refreshRes.status}`);
      }

      // 11. Upload a mock document
      const formData = new FormData();
      const blob = new Blob(["%PDF-1.5 dummy content"], { type: "application/pdf" });
      formData.append("file", blob, "test_week2_contract.pdf");

      const uploadRes = await fetch(`${baseUrl}/api/v1/documents`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${newAccessToken || accessToken}`,
        },
        body: formData,
      });
      const uploadData = await uploadRes.json();
      const uploadedDocId = uploadData.document?.id;
      if (uploadRes.status === 201 && uploadedDocId) {
        console.log(`✅ 11. Success: Document uploaded successfully, received ID: ${uploadedDocId}`);
      } else {
        failures.push(`Document upload failed: status ${uploadRes.status}, data: ${JSON.stringify(uploadData)}`);
      }

      // 12. Poll document status (it should be "uploaded" or "processing" or "done")
      if (uploadedDocId) {
        const pollRes = await fetch(`${baseUrl}/api/v1/documents/${uploadedDocId}`, {
          headers: {
            "Authorization": `Bearer ${newAccessToken || accessToken}`,
          },
        });
        const pollData = await pollRes.json();
        if (pollRes.status === 200 && pollData.document?.id === uploadedDocId) {
          console.log(`✅ 12. Success: Polled document, current status: ${pollData.document.status}`);
        } else {
          failures.push(`Poll document failed: status ${pollRes.status}`);
        }
      }

      // 13. List documents (paginated list)
      const listRes = await fetch(`${baseUrl}/api/v1/documents?page=1&limit=5`, {
        headers: {
          "Authorization": `Bearer ${newAccessToken || accessToken}`,
        },
      });
      const listData = await listRes.json();
      if (listRes.status === 200 && Array.isArray(listData.documents) && listData.documents.length > 0) {
        console.log(`✅ 13. Success: Retrieved document list with pagination: total items: ${listData.pagination?.total}`);
      } else {
        failures.push(`List documents failed: status ${listRes.status}`);
      }

    } catch (err: any) {
      failures.push(`Execution error during verification: ${err.message}`);
    } finally {
      server.close();
      await prisma.$disconnect();
    }

    console.log("==========================================");
    if (failures.length > 0) {
      console.error("❌ Week 2 Verification FAILED with issues:");
      failures.forEach((f) => console.error(` - ${f}`));
      process.exit(1);
    } else {
      console.log("🎉 Week 2 Verification PASSED! Document routes, swagger and JWT middleware protection verified.");
      process.exit(0);
    }
  });
}

runVerification();
