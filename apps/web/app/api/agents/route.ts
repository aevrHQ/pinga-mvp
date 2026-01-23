import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Agent from "@/models/Agent";
import AgentToken from "@/models/AgentToken";
import { generateAgentToken, verifyAgentToken, extractToken } from "@/lib/agentAuth";
import { randomUUID } from "crypto";

/**
 * POST /api/agents/register
 * Register a new agent with the platform
 * 
 * Request body:
 * {
 *   agentId: string,
 *   userId: string,
 *   name: string,
 *   version: string,
 *   platform: string,
 *   capabilities: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { agentId, userId, name, version, platform, capabilities } =
      await request.json();

    // Validate required fields
    if (!agentId || !userId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: agentId, userId, name" },
        { status: 400 }
      );
    }

    // Check if agent already exists
    let agent = await Agent.findOne({ agentId });
    if (agent) {
      // Update existing agent
      agent.status = "online";
      agent.lastHeartbeat = new Date();
      agent.version = version || agent.version;
      agent.platform = platform || agent.platform;
      agent.capabilities = capabilities || agent.capabilities;
      await agent.save();
    } else {
      // Create new agent
      agent = await Agent.create({
        userId,
        name,
        agentId,
        status: "online",
        lastHeartbeat: new Date(),
        version,
        platform,
        capabilities,
      });
    }

    // Generate JWT token
    const { token, expiresAt } = generateAgentToken(agentId, userId);

    // Save token to database
    await AgentToken.create({
      agentId,
      userId,
      token,
      expiresAt,
    });

    return NextResponse.json(
      {
        success: true,
        agent: {
          id: agent.agentId,
          name: agent.name,
          status: agent.status,
        },
        token,
        expiresAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[agents/register]", error);
    return NextResponse.json(
      { error: "Failed to register agent" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents
 * List all agents for the authenticated user
 * Requires: Authorization: Bearer <token>
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Extract token from Authorization header
    const token = extractToken(request.headers.get("Authorization") || "");
    if (!token) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyAgentToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Get agents for this user
    const agents = await Agent.find({ userId: payload.userId });

    return NextResponse.json(
      {
        success: true,
        agents: agents.map((agent) => ({
          id: agent.agentId,
          name: agent.name,
          status: agent.status,
          lastHeartbeat: agent.lastHeartbeat,
          createdAt: agent.createdAt,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[agents/GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}
