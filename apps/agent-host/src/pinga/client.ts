import axios from "axios";
import { ProgressUpdate } from "../types.js";

class PingaClient {
  private apiUrl: string;
  private apiSecret: string;

  constructor(apiUrl: string, apiSecret: string) {
    this.apiUrl = apiUrl;
    this.apiSecret = apiSecret;
  }

  async sendProgressUpdate(update: ProgressUpdate): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/api/copilot/task-update`, update, {
        headers: {
          "X-API-Secret": this.apiSecret,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to send progress update to Pinga:", error);
      throw error;
    }
  }

  async notifyCompletion(
    taskId: string,
    result: {
      prUrl?: string;
      output?: string;
      summary?: string;
    }
  ): Promise<void> {
    await this.sendProgressUpdate({
      taskId,
      status: "completed",
      step: "Task completed",
      progress: 1.0,
      details: JSON.stringify(result),
    });
  }

  async notifyError(taskId: string, error: string): Promise<void> {
    await this.sendProgressUpdate({
      taskId,
      status: "failed",
      step: "Task failed",
      progress: 0,
      error,
    });
  }
}

export default PingaClient;
