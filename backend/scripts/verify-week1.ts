import express from "express";
import app from "../src/app";
import { swaggerSpec } from "../src/config/swagger";
import { AuthService } from "../src/services/auth.service";
import { prisma } from "../src/config/db";

async function runVerification() {
  console.log("==========================================");
  console.log("🧪 Starting LegalEase Week 1 Verification Pass");
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
    "/health",
    "/api/v1/auth/register",
    "/api/v1/auth/login",
    "/api/v1/auth/refresh",
  ];

  for (const path of requiredPaths) {
    if (!paths.includes(path)) {
      failures.push(`Swagger spec missing required path: ${path}`);
    }
  }

  if (failures.length === 0) {
    console.log("✅ 2. All 4 endpoints present in Swagger OpenAPI spec");
  }

  // 3. Verify OpenAPI Schemas
  const schemas = Object.keys(specAny.components?.schemas || {});
  console.log("🔍 Registered OpenAPI Schemas:", schemas);
  const requiredSchemas = [
    "RegisterRequest",
    "LoginRequest",
    "RefreshRequest",
    "User",
    "AuthSuccessResponse",
    "RefreshSuccessResponse",
    "ErrorResponse",
    "HealthResponse",
  ];

  for (const schema of requiredSchemas) {
    if (!schemas.includes(schema)) {
      failures.push(`Swagger spec missing required schema: ${schema}`);
    }
  }

  if (failures.length === 0) {
    console.log("✅ 3. All required request/response schemas defined in Swagger");
  }

  // 4. Test HTTP Server endpoints using live test server
  const server = app.listen(0, async () => {
    const address = server.address() as any;
    const baseUrl = `http://localhost:${address.port}`;

    try {
      // Test GET /health
      const healthRes = await fetch(`${baseUrl}/health`);
      const healthData = await healthRes.json();
      if (healthRes.status === 200 && healthData.status === "ok") {
        console.log("✅ 4. GET /health returned 200 OK with healthy payload");
      } else {
        failures.push(`GET /health failed: status ${healthRes.status}`);
      }

      // Test GET /docs/openapi.json
      const openapiRes = await fetch(`${baseUrl}/docs/openapi.json`);
      const openapiData = await openapiRes.json();
      if (openapiRes.status === 200 && openapiData.openapi === "3.0.0") {
        console.log("✅ 5. GET /docs/openapi.json returned valid OpenAPI 3.0 spec");
      } else {
        failures.push(`GET /docs/openapi.json failed: status ${openapiRes.status}`);
      }

      // Test Zod Validation Error (POST /api/v1/auth/register with invalid body)
      const registerValRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid-email" }),
      });
      const registerValData = await registerValRes.json();
      if (
        registerValRes.status === 400 &&
        registerValData.error_code === "VALIDATION_ERROR" &&
        Array.isArray(registerValData.details)
      ) {
        console.log("✅ 6. Validation Error Test: POST /api/v1/auth/register returned 400 Bad Request with standardized error model");
      } else {
        failures.push(`Validation Error Test failed: expected 400, got ${registerValRes.status}`);
      }

      // Test Zod Validation Error (POST /api/v1/auth/login with missing fields)
      const loginValRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const loginValData = await loginValRes.json();
      if (
        loginValRes.status === 400 &&
        loginValData.error_code === "VALIDATION_ERROR"
      ) {
        console.log("✅ 7. Validation Error Test: POST /api/v1/auth/login returned 400 Bad Request with standardized error model");
      } else {
        failures.push(`Validation Error Test failed: expected 400, got ${loginValRes.status}`);
      }

      // Test Zod Validation Error (POST /api/v1/auth/refresh with missing refreshToken)
      const refreshValRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const refreshValData = await refreshValRes.json();
      if (
        refreshValRes.status === 400 &&
        refreshValData.error_code === "VALIDATION_ERROR"
      ) {
        console.log("✅ 8. Validation Error Test: POST /api/v1/auth/refresh returned 400 Bad Request with standardized error model");
      } else {
        failures.push(`Validation Error Test failed: expected 400, got ${refreshValRes.status}`);
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
      process.exit(1);
    } else {
      console.log("🎉 Verification PASSED! All deliverables & endpoints confirmed.");
      process.exit(0);
    }
  });
}

runVerification();
