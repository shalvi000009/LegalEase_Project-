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
