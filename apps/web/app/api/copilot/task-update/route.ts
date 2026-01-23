// Devflow task update endpoint
// Receives progress updates from Agent Host and relays to user's chat

import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { sendPlainMessage } from "@/lib/webhook/telegram";
import { sendSlackMessage } from "@/lib/webhook/slack";
import { config } from "@/lib/webhook/config";

interface ProgressUpdate {
  taskId: string;
  status: "in_progress" | "completed" | "failed";
  step: string;
  progress: number; // 0-1
  details?: string;
  error?: string;
  timestamp?: number;
}

// Store task mappings (taskId -> {channel, chatId, etc})
// In production, this should be in MongoDB
const taskMappings = new Map<
  string,
  {
    chatId: string;
    channel: "telegram" | "slack";
    token?: string;
  }
>();

export function storeTaskMapping(
  taskId: string,
  chatId: string,
  channel: "telegram" | "slack",
  token?: string
): void {
  taskMappings.set(taskId, { chatId, channel, token });
}

export async function POST(request: NextRequest) {
  try {
    // Verify the request has the correct secret
    const authHeader = request.headers.get("X-API-Secret");
    const expectedSecret = process.env.DEVFLOW_API_SECRET || "devflow-secret";

    if (!authHeader || authHeader !== expectedSecret) {
      console.error(
        "[Copilot] Invalid API secret for task update:",
        authHeader
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update: ProgressUpdate = await request.json();

    console.log(
      `[Copilot] Task Update: ${update.taskId} - ${update.status} - ${update.step}`
    );

    // Get the task mapping
    const mapping = taskMappings.get(update.taskId);
    if (!mapping) {
      console.error(`[Copilot] No mapping found for task: ${update.taskId}`);
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Format message based on status
    let message = "";

    if (update.status === "in_progress") {
      const progressBar = generateProgressBar(update.progress);
      message =
        `⏳ *${update.step}*\n\n` +
        `${progressBar} ${Math.round(update.progress * 100)}%\n\n` +
        (update.details ? `📝 ${update.details}\n\n` : "") +
        `Task ID: \`${update.taskId}\``;
    } else if (update.status === "completed") {
      message =
        `✅ *Task Completed!*\n\n` +
        `${update.step}\n\n` +
        (update.details ? `📊 ${update.details}\n\n` : "") +
        `Task ID: \`${update.taskId}\``;
    } else if (update.status === "failed") {
      message =
        `❌ *Task Failed*\n\n` +
        `${update.step}\n\n` +
        `Error: ${update.error || "Unknown error"}\n\n` +
        `Task ID: \`${update.taskId}\``;
    }

    // Send to appropriate channel
    if (mapping.channel === "telegram") {
      await sendPlainMessage(message, mapping.chatId);
    } else if (mapping.channel === "slack") {
      await sendSlackMessage(mapping.token || config.slack.botToken, mapping.chatId, message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Copilot] Task update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: Generate a simple progress bar
function generateProgressBar(progress: number): string {
  const filled = Math.round(progress * 10);
  const empty = 10 - filled;
  return "[" + "█".repeat(filled) + "░".repeat(empty) + "]";
}
