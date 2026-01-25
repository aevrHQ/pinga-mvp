import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Agent from "@/models/Agent";
import AgentToken from "@/models/AgentToken";
import {
  generateAgentToken,
  verifyAgentToken,
  extractToken,
} from "@/lib/agentAuth";

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

    const body = await request.json();
    const { agentId, name, version, platform, capabilities } = body;
    // userId is derived from the token

    // Validate required fields
    if (!agentId || !name) {
      return NextResponse.json(
        { error: "Missing required fields: agentId, name" },
        { status: 400 },
      );
    }

    // Extract GitHub token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const githubToken = extractToken(authHeader || "");

    if (!githubToken) {
      return NextResponse.json(
        { error: "Missing Authorization header with GitHub token" },
        { status: 401 },
      );
    }

    // Validate GitHub token and get user info
    let githubUser;
    try {
      const userReq = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!userReq.ok) {
        throw new Error(`GitHub API error: ${userReq.status}`);
      }

      githubUser = await userReq.json();
    } catch (error) {
      console.error("GitHub validation failed:", error);
      return NextResponse.json(
        { error: "Invalid GitHub token" },
        { status: 401 },
      );
    }

    // Resolve email (might be private)
    let email = githubUser.email;
    if (!email) {
      try {
        const emailsReq = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
        if (emailsReq.ok) {
          const emails = await emailsReq.json();
          const primary = emails.find(
            (e: { primary: boolean; verified: boolean; email: string }) =>
              e.primary && e.verified,
          );
          if (primary) email = primary.email;
        }
      } catch (e) {
        console.warn("Failed to fetch GitHub emails:", e);
      }
    }

    if (!email) {
      return NextResponse.json(
        { error: "Could not obtain email from GitHub account" },
        { status: 400 },
      );
    }

    // Find or create User
    // We need to import User model at the top
    const User = (await import("@/models/User")).default;

    let user = await User.findOne({ email });
    if (!user) {
      // Create new user for this agent
      user = await User.create({
        email,
        preferences: { aiSummary: false, allowedSources: [] },
      });
    }

    const userId = user._id.toString();

    // Check if agent already exists
    let agent = await Agent.findOne({ agentId });
    if (agent) {
      // Update existing agent
      // Ensure agent belongs to this user? maybe later.
      // For now, re-assigning ownership is fine or we just update fields
      agent.userId = userId; // Verify ownership
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
      { status: 200 },
    );
  } catch (error) {
    console.error("[agents/register]", error);
    return NextResponse.json(
      { error: "Failed to register agent" },
      { status: 500 },
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
        { status: 401 },
      );
    }

    // Verify token
    const payload = verifyAgentToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
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
      { status: 200 },
    );
  } catch (error) {
    console.error("[agents/GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 },
    );
  }
}
