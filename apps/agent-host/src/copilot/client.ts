// Copilot SDK client - Real SDK Integration
// Uses @github/copilot-sdk for agent control
// Reference: https://github.com/github/copilot-sdk

import { CopilotClient as RealCopilotClient, SessionEvent as RealSessionEvent } from "@github/copilot-sdk";

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
    result?: any;
    message?: string;
  };
}

export interface Session {
  sendAndWait(request: { prompt: string }): Promise<any>;
  on(callback: (event: SessionEvent) => void): void;
}

/**
 * CopilotClient - Wrapper for GitHub Copilot SDK
 * 
 * This uses the real @github/copilot-sdk package installed from npm.
 * 
 * Requirements:
 * - GitHub Copilot CLI installed and authenticated (copilot --version)
 * - @github/copilot-sdk package installed (npm install @github/copilot-sdk)
 */
export class CopilotClient {
  private model: string = process.env.COPILOT_MODEL || "gpt-4.1";
  private client: RealCopilotClient;
  private eventListeners: Array<(event: SessionEvent) => void> = [];

  constructor() {
    // Initialize the real SDK client
    this.client = new RealCopilotClient();
  }

  async createSession(options: CopilotClientOptions): Promise<Session> {
    const self = this;
    
    const model = options.model || this.model;
    console.log(`[CopilotClient] Creating session with model: ${model}`);
    console.log(`[CopilotClient] Streaming: ${options.streaming !== false}`);
    if (options.tools?.length) {
      console.log(`[CopilotClient] Tools: ${options.tools.map((t: any) => t.name || "unknown").join(", ")}`);
    }
    
    try {
      // Create real SDK session
      const realSession = await this.client.createSession({
        model,
        streaming: options.streaming !== false,
        tools: options.tools || [],
      });

      // Wrap the real session to normalize event types
      return {
        async sendAndWait(request: { prompt: string }) {
          let output = "";
          
          realSession.on((event: any) => {
            // Normalize SDK events to our interface
            let mappedEvent: SessionEvent | null = null;

            if (event.type === "assistant.message_delta") {
              mappedEvent = {
                type: "assistant.message_delta",
                data: { deltaContent: event.data?.deltaContent },
              };
              output += event.data?.deltaContent || "";
            } else if (event.type === "session.idle") {
              mappedEvent = { type: "session.idle" };
            } else if (event.type === "tool.start" || event.type === "tool_start") {
              mappedEvent = {
                type: "tool.start",
                data: { toolName: event.data?.toolName },
              };
            } else if (event.type === "tool.end" || event.type === "tool_end") {
              mappedEvent = {
                type: "tool.end",
                data: { result: event.data?.result },
              };
            } else if (event.type === "error") {
              mappedEvent = {
                type: "error",
                data: { message: event.data?.message },
              };
            }

            if (mappedEvent) {
              self.eventListeners.forEach(listener => listener(mappedEvent!));
            }
          });

          const response = await realSession.sendAndWait(request);
          return response;
        },
        on(callback: (event: SessionEvent) => void) {
          self.eventListeners.push(callback);
        },
      };
    } catch (error) {
      console.error("[CopilotClient] Failed to create session:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log("[CopilotClient] Stopping session...");
    // Real SDK cleanup if needed
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
 * Creates Copilot SDK-compatible tool definitions
 * 
 * Example:
 * const gitTool = defineTool("git_ops", {
 *   description: "Execute git operations",
 *   parameters: {
 *     type: "object",
 *     properties: { ... },
 *     required: [...]
 *   },
 *   handler: async (args) => ({ ... })
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


