import axios, { AxiosInstance } from "axios";

export interface CommandRequest {
  task_id: string;
  intent: string;
  repo: string;
  branch?: string;
  description: string;
  created_at: string;
}

export interface ProgressUpdate {
  status: "in_progress" | "completed" | "failed";
  step: string;
  progress: number; // 0-1
  details?: string;
}

export interface TaskCompletion {
  success: boolean;
  pr_url?: string;
  error_message?: string;
}

export class PlatformClient {
  private client: AxiosInstance;
  private agentId: string;
  private token: string;

  constructor(platformUrl: string, agentId: string, token: string) {
    this.agentId = agentId;
    this.token = token;

    this.client = axios.create({
      baseURL: platformUrl,
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "devflow-agent/0.1.0",
      },
    });
  }

  async register(): Promise<{ success: boolean; token: string; agent: { id: string; name: string } }> {
    const response = await this.client.post("/api/agents", {
      agentId: this.agentId,
      userId: "", // Will be set by platform from token
      name: "agent", // Will be updated by platform
      version: "0.1.0",
      platform: process.platform,
      capabilities: ["fix-bug", "feature", "explain", "review-pr"],
    });
    return response.data;
  }

  async getCommands(): Promise<CommandRequest[]> {
    const response = await this.client.get(`/api/agents/${this.agentId}/commands`);
    return response.data.commands || [];
  }

  async heartbeat(): Promise<{ success: boolean; lastHeartbeat: string }> {
    const response = await this.client.post(`/api/agents/${this.agentId}/heartbeat`);
    return response.data;
  }

  async reportProgress(
    taskId: string,
    update: ProgressUpdate
  ): Promise<{ success: boolean }> {
    const response = await this.client.post(`/api/tasks/${taskId}/progress`, {
      ...update,
      reported_at: new Date().toISOString(),
    });
    return response.data;
  }

  async completeTask(
    taskId: string,
    completion: TaskCompletion
  ): Promise<{ success: boolean }> {
    const response = await this.client.post(`/api/tasks/${taskId}/complete`, {
      ...completion,
      completed_at: new Date().toISOString(),
    });
    return response.data;
  }

  async failTask(
    taskId: string,
    error: string
  ): Promise<{ success: boolean }> {
    return this.completeTask(taskId, {
      success: false,
      error_message: error,
    });
  }
}
