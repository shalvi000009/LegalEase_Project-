import { AiClient } from "../src/services/aiClient";

async function main() {
  console.log("🔍 Checking AI service connection from Backend...");
  try {
    const health = await AiClient.health();
    console.log("✅ AI Health Check Succeeded:", health);

    console.log("\n🧪 Testing contract extraction & analysis pipeline...");
    const analysis = await AiClient.analyze("handshake-test-doc", "sample_contract.pdf");
    console.log("✅ AI Analyze Call Succeeded:");
    console.log(`   - Status: ${analysis.status}`);
    console.log(`   - Risk Score: ${analysis.overall_risk_score} (${analysis.overall_risk_level})`);
    console.log(`   - Total Clauses Classified: ${analysis.clauses?.length ?? 0}`);
    if (analysis.clauses && analysis.clauses.length > 0) {
      console.log(`   - Top Clause: ${analysis.clauses[0].clause_type} (Risk: ${analysis.clauses[0].risk_level})`);
    }
    console.log(`   - Missing Clauses Flagged: ${analysis.missing_clauses?.join(", ") || "None"}`);
    console.log("\n🎉 Handshake between Backend (port 4000) and AI Service (port 8000) is 100% verified!");
  } catch (error: any) {
    console.error("❌ AI Service Handshake Failed:", error.message);
  }
}

main();
