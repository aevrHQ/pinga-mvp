import { Schema, model, models, Document, Model } from "mongoose";

export interface IAgentToken {
  agentId: string;
  userId: string;
  token: string; // JWT token
  expiresAt: Date;
  createdAt: Date;
}

export interface AgentTokenDocument extends IAgentToken, Document {}

const AgentTokenSchema = new Schema<AgentTokenDocument>(
  {
    agentId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  {
    timestamps: true,
  },
);

// Auto-delete expired tokens
// Auto-delete expired tokens
// AgentTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Already indexed in schema definition

const AgentToken =
  (models.AgentToken as Model<AgentTokenDocument>) ||
  model<AgentTokenDocument>("AgentToken", AgentTokenSchema);

export default AgentToken;
