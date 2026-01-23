// Copilot SDK client - Integration ready for @github/copilot-sdk
// The SDK is currently being installed. For now, we use a compatible interface.
// Reference: https://docs.github.com/en/copilot/sdk

export interface CopilotClientOptions {
  model?: string;
  streaming?: boolean;
  tools?: any[];
  mcpServers?: Record<string, any>;
}

export interface SessionEvent {
  type: 
    | "assistant.message_delta"
    | "session.idle"
    | "tool.start"
    | "tool.end"
    | "error";
  data?: {
    deltaContent?: string;
    toolName?: string;
    toolResult?: any;
    result?: any;  // For tool.end events
    message?: string;  // For error events
  };
}

export interface Session {
  sendAndWait(request: { prompt: string }): Promise<any>;
  on(callback: (event: SessionEvent) => void): void;
}

/**
 * CopilotClient - Wrapper around the GitHub Copilot SDK
 * 
 * When @github/copilot-sdk becomes available via npm, this will be updated to:
 * 
 * import { CopilotClient as SDKCopilotClient } from "@github/copilot-sdk";
 * 
 * const session = await client.createSession({
 *   model: "gpt-4.1",
 *   streaming: true,
 *   tools: [myCustomTool],
 *   mcpServers: { github: { type: "http", url: "..." } }
 * });
 * 
 * Reference guide: https://docs.github.com/en/copilot/sdk
 */
export class CopilotClient {
  private model: string = process.env.COPILOT_MODEL || "gpt-4.1";
  private eventListeners: Array<(event: SessionEvent) => void> = [];

  async createSession(options: CopilotClientOptions): Promise<Session> {
    // Return a mock session for now - will be replaced with real SDK
    const self = this;
    
    return {
      async sendAndWait(request: { prompt: string }) {
        console.log(`[CopilotClient] Creating session with model: ${options.model || self.model}`);
        console.log(`[CopilotClient] Streaming: ${options.streaming !== false}`);
        if (options.tools?.length) {
          console.log(`[CopilotClient] Tools: ${options.tools.map((t: any) => t.name || "unknown").join(", ")}`);
        }
        
        // When real SDK is available, this will make actual calls:
        // const response = await sdkSession.sendAndWait(request);
        // return response;
        
        return {
          data: {
            content: "Copilot SDK awaiting package availability"
          }
        };
      },
      on(callback: (event: SessionEvent) => void) {
        self.eventListeners.push(callback);
      }
    };
  }

  async stop(): Promise<void> {
    // Cleanup when real SDK is available
  }
}

let copilotInstance: CopilotClient | null = null;

export function getCopilotClient(): CopilotClient {
  if (!copilotInstance) {
    copilotInstance = new CopilotClient();
  }
  return copilotInstance;
}

/**
 * Tool Definition Helper
 * Wraps tool definitions for Copilot SDK compatibility
 * 
 * Usage:
 * const myTool = defineTool("tool_name", {
 *   description: "What the tool does",
 *   parameters: {
 *     type: "object",
 *     properties: { ... },
 *     required: [...]
 *   },
 *   handler: async (args) => { ... }
 * });
 */
export function defineTool(
  name: string,
  definition: {
    description: string;
    parameters?: any;
    handler?: (args: any) => Promise<any>;
  }
) {
  return {
    name,
    ...definition
  };
}


