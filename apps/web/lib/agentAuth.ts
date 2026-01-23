import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "devflow-secret-key-change-in-prod";
const JWT_EXPIRY = "30d"; // 30 days

export interface AgentTokenPayload {
  agentId: string;
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for an agent
 */
export function generateAgentToken(
  agentId: string,
  userId: string
): { token: string; expiresAt: Date } {
  const expiresIn = JWT_EXPIRY;
  const token = jwt.sign({ agentId, userId }, JWT_SECRET, { expiresIn });

  // Calculate expiration date
  const decoded = jwt.decode(token) as any;
  const expiresAt = new Date(decoded.exp * 1000);

  return { token, expiresAt };
}

/**
 * Verify and decode a JWT token
 */
export function verifyAgentToken(token: string): AgentTokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AgentTokenPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}
