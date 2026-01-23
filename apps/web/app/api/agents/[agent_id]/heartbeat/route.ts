import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Agent from "@/models/Agent";
import { verifyAgentToken, extractToken } from "@/lib/agentAuth";

/**
 * POST /api/agents/[agent_id]/heartbeat
 * Update agent's last heartbeat and keep it online
 * Requires: Authorization: Bearer <token>
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agent_id: string }> }
) {
  try {
    await connectDB();

    const { agent_id: agentId } = await params;

    // Extract and verify token
    const token = extractToken(request.headers.get("Authorization") || "");
    if (!token) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const payload = verifyAgentToken(token);
    if (!payload || payload.agentId !== agentId) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Update agent's heartbeat
    const agent = await Agent.findOneAndUpdate(
      { agentId, userId: payload.userId },
      {
        lastHeartbeat: new Date(),
        status: "online",
      },
      { new: true }
    );

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        lastHeartbeat: agent.lastHeartbeat,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[agents/[agent_id]/heartbeat]", error);
    return NextResponse.json(
      { error: "Failed to update heartbeat" },
      { status: 500 }
    );
  }
}
