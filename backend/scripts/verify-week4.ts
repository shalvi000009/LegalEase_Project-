import app from "../src/app";
import { swaggerSpec } from "../src/config/swagger";
import { prisma } from "../src/config/db";

async function runVerification() {
  console.log("==========================================");
  console.log("🧪 Starting LegalEase Week 4 Verification Pass");
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
    "/api/v1/chat/sessions",
    "/api/v1/chat/sessions/{id}/messages",
    "/api/v1/chat/sessions/{id}/stream",
  ];

  for (const path of requiredPaths) {
    if (!paths.includes(path)) {
      failures.push(`Swagger spec missing required path: ${path}`);
    }
  }

  if (failures.length === 0) {
    console.log("✅ 2. All 3 chat endpoints present in Swagger OpenAPI spec");
  }

  // 3. Test HTTP Server endpoints using live test server
  const server = app.listen(0, async () => {
    const address = server.address() as any;
    const baseUrl = `http://localhost:${address.port}`;

    try {
      // Test Auth check: GET /api/v1/chat/sessions/mock-session-id/messages without token
      const noAuthRes = await fetch(`${baseUrl}/api/v1/chat/sessions/f47ac10b-58cc-4372-a567-0e02b2c3d479/messages`);
      const noAuthData = await noAuthRes.json();
      if (noAuthRes.status === 401 && noAuthData.error_code === "UNAUTHORIZED") {
        console.log("✅ 3. Auth Middleware Test: Request without token returned 401 Unauthorized");
      } else {
        failures.push(`Auth Middleware Test failed: expected 401, got ${noAuthRes.status}`);
      }

      // 4. Register a test user
      const registerRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Verify Week 4 User",
          email: `verify.week4.${Date.now()}@example.com`,
          password: "Password123!",
        }),
      });
      const registerData = await registerRes.json();
      const accessToken = registerData.tokens?.accessToken;
      if (registerRes.status === 201 && accessToken) {
        console.log("✅ 4. User registered successfully and received authorization token");
      } else {
        failures.push(`User registration failed: status ${registerRes.status}`);
        return;
      }

      // 5. Upload a mock document to scope the chat session to
      const formData = new FormData();
      const blob = new Blob(["%PDF-1.5 dummy content"], { type: "application/pdf" });
      formData.append("file", blob, "test_week4_contract.pdf");

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
        console.log(`✅ 5. Document uploaded successfully, received ID: ${uploadedDocId}`);
      } else {
        failures.push(`Document upload failed: status ${uploadRes.status}`);
        return;
      }

      // 6. Create Chat Session scoped to the uploaded document
      const sessionRes = await fetch(`${baseUrl}/api/v1/chat/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ documentId: uploadedDocId }),
      });
      const sessionData = await sessionRes.json();
      const sessionId = sessionData.session?.id;
      if (sessionRes.status === 201 && sessionId) {
        console.log(`✅ 6. Chat session created successfully, session ID: ${sessionId}`);
      } else {
        failures.push(`Chat session creation failed: status ${sessionRes.status}`);
        return;
      }

      // 7. Create a User Message in the session
      const messageText = "What is the liability cap?";
      const msgRes = await fetch(`${baseUrl}/api/v1/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ content: messageText }),
      });
      const msgData = await msgRes.json();
      if (msgRes.status === 201 && msgData.message?.content === messageText) {
        console.log(`✅ 7. Message created successfully: "${msgData.message.content}"`);
      } else {
        failures.push(`Message creation failed: status ${msgRes.status}`);
      }

      // 8. Retrieve Message History
      const historyRes = await fetch(`${baseUrl}/api/v1/chat/sessions/${sessionId}/messages`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      const historyData = await historyRes.json();
      if (historyRes.status === 200 && Array.isArray(historyData.messages) && historyData.messages.length === 1) {
        console.log("✅ 8. Message history fetched, contains exactly the user message sent");
      } else {
        failures.push(`Fetch history failed: expected 1 message, got ${historyData.messages?.length}`);
      }

      // 9. Test SSE Streaming response
      console.log("🚀 Starting Server-Sent Events (SSE) Stream test...");
      const streamRes = await fetch(`${baseUrl}/api/v1/chat/sessions/${sessionId}/stream?message=Tell+me+about+the+liability`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (streamRes.status !== 200) {
        failures.push(`SSE stream endpoint returned non-200 status: ${streamRes.status}`);
        return;
      }

      const reader = streamRes.body?.getReader();
      if (!reader) {
        failures.push("No readable stream reader found in SSE response");
        return;
      }

      const decoder = new TextDecoder();
      let streamBuffer = "";
      let isDone = false;
      let hasTokens = false;
      let hasDoneMarker = false;

      while (!isDone) {
        const { value, done } = await reader.read();
        isDone = done;
        if (value) {
          const chunk = decoder.decode(value, { stream: !isDone });
          streamBuffer += chunk;
          
          // Parse SSE data: format is "data: <content>\n\n"
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataContent = line.slice(6).trim();
              if (dataContent === "[DONE]") {
                hasDoneMarker = true;
              } else {
                try {
                  const json = JSON.parse(dataContent);
                  if (json.token) {
                    hasTokens = true;
                  }
                } catch (e) {
                  // ignore parse issues on partial tokens/boundaries
                }
              }
            }
          }
        }
      }

      if (hasTokens && hasDoneMarker) {
        console.log("✅ 9. SSE stream completed successfully, yielded tokens and finished with [DONE] marker");
      } else {
        failures.push(`SSE stream test failed: hasTokens=${hasTokens}, hasDoneMarker=${hasDoneMarker}`);
      }

      // 10. Verify that the AI response was saved in database history
      const historyAfterRes = await fetch(`${baseUrl}/api/v1/chat/sessions/${sessionId}/messages`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      const historyAfterData = await historyAfterRes.json();
      const aiMsgs = historyAfterData.messages?.filter((m: any) => m.sender === "ai");
      if (historyAfterRes.status === 200 && aiMsgs && aiMsgs.length > 0) {
        console.log(`✅ 10. AI response successfully persisted in DB history: "${aiMsgs[0].content.substring(0, 50)}..."`);
      } else {
        failures.push(`DB Persistence failed: expected AI message saved in history, got: ${JSON.stringify(historyAfterData.messages)}`);
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
      console.log("🏆 WEEK 4 BACKEND WORKER VERIFICATION SUCCESSFUL!");
      process.exit(0);
    }
  });
}

runVerification();
