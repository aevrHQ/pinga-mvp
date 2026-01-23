import { Schema, model, models, Document, Model } from "mongoose";

export interface IAgent {
  userId: string; // Reference to User
  name: string;
  agentId: string; // Unique agent identifier (generated on registration)
  status: "online" | "offline" | "inactive";
  lastHeartbeat: Date;
  version: string;
  platform: string;
  capabilities: string[]; // ["fix-bug", "feature", "explain", "review-pr"]
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentDocument extends IAgent, Document {}

const AgentSchema = new Schema<AgentDocument>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    agentId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["online", "offline", "inactive"],
      default: "offline",
    },
    lastHeartbeat: { type: Date, default: () => new Date() },
    version: { type: String, default: "0.1.0" },
    platform: { type: String }, // e.g., "linux", "darwin", "win32"
    capabilities: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
);

const Agent =
  (models.Agent as Model<AgentDocument>) ||
  model<AgentDocument>("Agent", AgentSchema);

export default Agent;
