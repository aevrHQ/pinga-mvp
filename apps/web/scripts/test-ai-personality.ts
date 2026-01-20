import { generateEventSummary } from "../lib/agents/eventSummary";
import fs from "fs";
import path from "path";

// Manually load .env.local
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const firstEquals = line.indexOf("=");
    if (firstEquals !== -1) {
      const key = line.substring(0, firstEquals).trim();
      const value = line.substring(firstEquals + 1).trim();
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
}

async function testPersonality() {
  console.log("🤖 Testing AI Agent Personality...\n");

  const testCases = [
    {
      eventType: "deployment_status",
      source: "github",
      payload: {
        deployment_status: { state: "success" },
        repository: { full_name: "aevrspace/pinga-mvp" },
        sender: { login: "miracleonyenma" },
      },
    },
    {
      eventType: "issues",
      source: "github",
      payload: {
        action: "opened",
        issue: { number: 42, title: "Button is broken on mobile" },
        repository: { full_name: "company/app" },
        sender: { login: "new_user" },
      },
    },
  ];

  for (const testCase of testCases) {
    console.log(`--- Test Case: ${testCase.eventType} ---`);
    const summary = await generateEventSummary(testCase);
    console.log(`📝 Result:\n${summary}\n`);

    if (!summary) {
      console.error("❌ No summary generated. Check API Key.");
    }
  }
}

testPersonality().catch(console.error);
