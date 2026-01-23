// Core command types from Pinga
export interface TaskPayload {
  intent: "fix-bug" | "feature" | "explain" | "review-pr" | "deploy";
  repo: string;
  branch?: string;
  naturalLanguage: string;
  context?: Record<string, any>;
}

export interface CommandRequest {
  taskId: string;
  source: {
    channel: "telegram" | "slack";
    chatId: string;
    messageId: string;
  };
  payload: TaskPayload;
}

export interface CommandResponse {
  accepted: boolean;
  taskId: string;
  error?: string;
}

// Progress update types for Pinga
export interface ProgressUpdate {
  taskId: string;
  status: "in_progress" | "completed" | "failed";
  step: string;
  progress: number; // 0-1
  details?: string;
  error?: string;
  timestamp?: number;
}

// Tool execution tracking
export interface ToolExecution {
  toolName: string;
  status: "pending" | "running" | "completed" | "failed";
  startTime: number;
  endTime?: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
}

// Session tracking
export interface AgentSession {
  taskId: string;
  intent: string;
  repo: string;
  createdAt: number;
  status: "pending" | "active" | "completed" | "failed";
  toolExecutions: ToolExecution[];
  error?: string;
}
