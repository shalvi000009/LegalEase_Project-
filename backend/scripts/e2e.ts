import fs from "fs";
import path from "path";

const BASE_URL = process.env.API_URL || "http://127.0.0.1:4000/api/v1";

async function runE2eTest() {
  console.log("=================================================");
  console.log("🚀 LegalEase Backend End-to-End (E2E) Test Suite");
  console.log("=================================================");

  const timestamp = Date.now();
  const testUser = {
    email: `e2e_user_${timestamp}@legalease.test`,
    password: "Password123!",
    name: `E2E Tester ${timestamp}`,
  };

  let token = "";
  let documentId = "";

  // 1. Register User
  try {
    process.stdout.write("Step 1: Registering new test user... ");
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });

    if (!regRes.ok) {
      const err = await regRes.text();
      throw new Error(`Register failed (${regRes.status}): ${err}`);
    }
    const regData: any = await regRes.json();
    token = regData.token || regData.tokens?.access?.token || regData.accessToken;
    console.log("✅ PASS");
  } catch (err: any) {
    console.log(`❌ FAIL: ${err.message}`);
    process.exit(1);
  }

  // 2. Login User if token was not in registration
  if (!token) {
    try {
      process.stdout.write("Step 2: Logging in to acquire JWT token... ");
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testUser.email, password: testUser.password }),
      });

      if (!loginRes.ok) {
        throw new Error(`Login failed (${loginRes.status})`);
      }
      const loginData: any = await loginRes.json();
      token = loginData.token || loginData.tokens?.access?.token || loginData.accessToken;
      console.log("✅ PASS");
    } catch (err: any) {
      console.log(`❌ FAIL: ${err.message}`);
      process.exit(1);
    }
  }

  // 3. Upload Sample Contract PDF
  try {
    process.stdout.write("Step 3: Uploading sample contract PDF... ");
    const samplePath = path.resolve(__dirname, "../../ai-service/sample_docs/sample_contract.pdf");
    const fileBuffer = fs.readFileSync(samplePath);

    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
    const pre = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample_contract.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
    );
    const post = Buffer.from(`\r\n--${boundary}--\r\n`);
    const multipartBody = Buffer.concat([pre, fileBuffer, post]);

    const uploadRes = await fetch(`${BASE_URL}/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Upload failed (${uploadRes.status}): ${err}`);
    }

    const uploadData: any = await uploadRes.json();
    documentId = uploadData.document?.id || uploadData.id;
    if (!documentId) throw new Error("No document ID returned in response");
    console.log(`✅ PASS (Doc ID: ${documentId})`);
  } catch (err: any) {
    console.log(`❌ FAIL: ${err.message}`);
    process.exit(1);
  }

  // 4. Poll /documents/:id/status until COMPLETED
  try {
    process.stdout.write("Step 4: Polling processing status until completed (max 3 min)... ");
    const startTime = Date.now();
    let isComplete = false;

    while (Date.now() - startTime < 180000) {
      const statusRes = await fetch(`${BASE_URL}/documents/${documentId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (statusRes.ok) {
        const sData: any = await statusRes.json();
        const status = sData.status || sData.document?.status;

        if (status === "completed" || status === "done") {
          isComplete = true;
          break;
        } else if (status === "failed") {
          throw new Error("Document analysis failed in background");
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    if (!isComplete) throw new Error("Timed out waiting for analysis completion");
    console.log("✅ PASS");
  } catch (err: any) {
    console.log(`❌ FAIL: ${err.message}`);
    process.exit(1);
  }

  // 5. Fetch Analysis Results
  try {
    process.stdout.write("Step 5: Verifying contract analysis score and classified clauses... ");
    const analysisRes = await fetch(`${BASE_URL}/analysis/${documentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!analysisRes.ok) {
      throw new Error(`Failed to fetch analysis (${analysisRes.status})`);
    }

    const analysisData: any = await analysisRes.json();
    const score = analysisData.overall_risk_score ?? analysisData.analysis?.overall_risk_score;
    const clauses = analysisData.clauses ?? analysisData.analysis?.clauses ?? [];

    if (typeof score !== "number" || score < 0 || score > 100) {
      throw new Error(`Invalid risk score: ${score}`);
    }

    if (!Array.isArray(clauses) || clauses.length === 0) {
      throw new Error("Clauses array is empty or missing");
    }

    const sampleClause = clauses[0];
    if (!sampleClause.clause_type || !sampleClause.risk_level) {
      throw new Error("Clause object missing required fields (clause_type, risk_level)");
    }

    console.log(`✅ PASS (Score: ${score}/100, Clauses: ${clauses.length})`);
  } catch (err: any) {
    console.log(`❌ FAIL: ${err.message}`);
    process.exit(1);
  }

  // 6. Test RAG Chat Question
  try {
    process.stdout.write("Step 6: Asking a contract chat question via AI RAG... ");
    const chatSessionRes = await fetch(`${BASE_URL}/chat/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId }),
    });

    if (!chatSessionRes.ok) {
      throw new Error(`Create chat session failed (${chatSessionRes.status})`);
    }

    const sessionData: any = await chatSessionRes.json();
    const sessionId = sessionData.session?.id || sessionData.id;

    const askRes = await fetch(`${BASE_URL}/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "What are the termination terms under this agreement?" }),
    });

    if (!askRes.ok) {
      throw new Error(`Chat message query failed (${askRes.status})`);
    }

    const askData: any = await askRes.json();
    if (!askData.aiMessage?.content) {
      throw new Error("No AI response content returned");
    }

    console.log("✅ PASS");
    console.log(`   AI Answer Preview: "${askData.aiMessage.content.slice(0, 100)}..."`);
  } catch (err: any) {
    console.log(`❌ FAIL: ${err.message}`);
    process.exit(1);
  }

  console.log("=================================================");
  console.log("🎉 ALL BACKEND E2E CHECKS PASSED SUCCESSFULLY!");
  console.log("=================================================");
}

runE2eTest();
