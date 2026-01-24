import { Schema, model, models, Document, Model } from "mongoose";

export interface ITaskAssignment {
  taskId: string;
  agentId: string;
  userId: string;
  intent: string; // e.g., "fix-bug", "feature", "explain", "review-pr"
  status: "pending" | "in_progress" | "completed" | "failed";
  progress: number; // 0-1
  currentStep: string;
  startedAt: Date;
  completedAt?: Date;
  // User credentials (encrypted for managed SaaS mode)
  credentials?: {
    github?: string; // Encrypted GitHub PAT/OAuth token
  };
  result?: {
    success: boolean;
    output?: string;
    prUrl?: string;
    error?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskAssignmentDocument extends ITaskAssignment, Document {}

const TaskAssignmentSchema = new Schema<TaskAssignmentDocument>(
  {
    taskId: { type: String, required: true, unique: true, index: true },
    agentId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    intent: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "failed"],
      default: "pending",
    },
    progress: { type: Number, default: 0, min: 0, max: 1 },
    currentStep: { type: String, default: "queued" },
    startedAt: { type: Date },
    completedAt: { type: Date },
    // Encrypted credentials for managed SaaS mode
    credentials: {
      github: { type: String },
    },
    result: {
      success: { type: Boolean },
      output: { type: String },
      prUrl: { type: String },
      error: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

const TaskAssignment =
  (models.TaskAssignment as Model<TaskAssignmentDocument>) ||
  model<TaskAssignmentDocument>("TaskAssignment", TaskAssignmentSchema);

export default TaskAssignment;
