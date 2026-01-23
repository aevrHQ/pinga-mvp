// Devflow command endpoint
// Forwards Devflow commands to the Agent Host

import { NextRequest, NextResponse } from "next/server";
import { storeTaskMapping } from "../task-update/route";

export interface DevflowRequest {
  taskId: string;
  source: {
    channel: "telegram" | "slack";
    chatId: string;
    messageId: string;
  };
  payload: {
    intent: "fix-bug" | "feature" | "explain" | "review-pr" | "deploy";
    repo: string;
    branch?: string;
    naturalLanguage: string;
    context?: Record<string, any>;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify secret
    const authHeader = request.headers.get("X-API-Secret");
    const expectedSecret = process.env.DEVFLOW_API_SECRET || "devflow-secret";

    if (!authHeader || authHeader !== expectedSecret) {
      console.error("[Copilot Command] Invalid API secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const devflowRequest: DevflowRequest = await request.json();

    console.log(
      `[Copilot Command] Forwarding ${devflowRequest.payload.intent} for ${devflowRequest.payload.repo}`
    );

    // Store the mapping so task updates know where to send responses
    storeTaskMapping(
      devflowRequest.taskId,
      devflowRequest.source.chatId,
      devflowRequest.source.channel
    );

    // Forward to Agent Host
    const agentHostUrl =
      process.env.AGENT_HOST_URL || "http://localhost:3001";

    const response = await fetch(`${agentHostUrl}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(devflowRequest),
    });

    if (!response.ok) {
      console.error(
        `[Copilot Command] Agent Host returned ${response.status}`
      );
      return NextResponse.json(
        { error: `Agent Host error: ${response.status}` },
        { status: 502 }
      );
    }

    const result = await response.json();

    console.log(`[Copilot Command] Agent Host accepted task: ${devflowRequest.taskId}`);

    return NextResponse.json({
      ok: true,
      taskId: devflowRequest.taskId,
      message: "Command forwarded to Agent Host",
    });
  } catch (error) {
    console.error("[Copilot Command] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
