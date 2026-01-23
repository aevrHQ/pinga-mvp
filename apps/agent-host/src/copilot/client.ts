// Copilot SDK client singleton
// When @github/copilot-sdk becomes available, replace this with actual import

interface CopilotClientOptions {
  model?: string;
  streaming?: boolean;
  tools?: any[];
  mcpServers?: Record<string, any>;
}

interface SessionEvent {
  type: string;
  data?: any;
}

interface Session {
  sendAndWait(request: { prompt: string }): Promise<any>;
  on(callback: (event: SessionEvent) => void): void;
}

export class CopilotClient {
  async createSession(options: CopilotClientOptions): Promise<Session> {
    // TODO: Implement when @github/copilot-sdk is available
    throw new Error(
      "CopilotClient not yet implemented. Waiting for @github/copilot-sdk package."
    );
  }
}

let copilotInstance: CopilotClient | null = null;

export function getCopilotClient(): CopilotClient {
  if (!copilotInstance) {
    copilotInstance = new CopilotClient();
  }
  return copilotInstance;
}

