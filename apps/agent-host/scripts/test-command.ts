#!/usr/bin/env node

import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3001";

async function testCommand() {
  try {
    const response = await axios.post(`${API_URL}/command`, {
      taskId: "test-task-001",
      source: {
        channel: "telegram",
        chatId: "123456789",
        messageId: "msg-001",
      },
      payload: {
        intent: "fix-bug",
        repo: "miracleonyenma/meta-ads-api",
        branch: "main",
        naturalLanguage:
          "Fix the authentication issue where users cannot log in",
        context: {
          errorMessage: "Invalid token",
        },
      },
    });

    console.log("✅ Command accepted!");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testCommand();
