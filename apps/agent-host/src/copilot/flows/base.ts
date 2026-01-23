// Workflow executor base and orchestration logic
import { CopilotClient, Session, SessionEvent } from "../client.js";
import { CommandRequest, ProgressUpdate } from "../../types.js";
import PingaClient from "../../pinga/client.js";
import { getAllTools } from "../tools/index.js";

export interface WorkflowContext {
  taskId: string;
  intent: string;
  repo: string;
  branch?: string;
  naturalLanguage: string;
  context?: Record<string, any>;
  source: {
    channel: "telegram" | "slack";
    chatId: string;
    messageId: string;
  };
}

export interface WorkflowResult {
  success: boolean;
  output?: string;
  prUrl?: string;
  summary?: string;
  error?: string;
}

export class WorkflowExecutor {
  protected pingaClient: PingaClient;
  protected copilot: CopilotClient;

  constructor(pingaUrl: string, pingaSecret: string) {
    this.pingaClient = new PingaClient(pingaUrl, pingaSecret);
    this.copilot = new CopilotClient(); // Will be replaced with actual SDK when available
  }

  protected async sendProgress(
    taskId: string,
    step: string,
    progress: number,
    details?: string
  ): Promise<void> {
    await this.pingaClient.sendProgressUpdate({
      taskId,
      status: "in_progress",
      step,
      progress: Math.min(progress, 0.99), // Leave 1% for completion
      details,
      timestamp: Date.now(),
    });
  }

  protected async sendCompletion(
    taskId: string,
    result: WorkflowResult
  ): Promise<void> {
    if (result.success) {
      await this.pingaClient.notifyCompletion(taskId, {
        summary: result.summary || "Workflow completed successfully",
        prUrl: result.prUrl,
        output: result.output,
      });
    } else {
      await this.pingaClient.notifyError(
        taskId,
        result.error || "Workflow failed"
      );
    }
  }

  protected buildSystemPrompt(
    intent: string,
    context: WorkflowContext
  ): string {
    return `You are Devflow, an AI DevOps agent integrated with GitHub Copilot.

Your task: ${intent}
Repository: ${context.repo}
Branch: ${context.branch || "main"}
Request: ${context.naturalLanguage}
Task ID: ${context.taskId}

You have access to these tools:
- git_operations: Clone, branch, commit, push repositories
- run_tests: Run test suites and capture results
- read_file, write_file, list_files: File operations
- open_pull_request: Create and manage pull requests
- send_progress_update: Send progress updates to the user

IMPORTANT:
1. Always send progress updates at key milestones
2. Use read_file to examine code before making changes
3. Verify changes with run_tests before pushing
4. Create pull requests with clear descriptions
5. Report all errors clearly with context

Begin by understanding the repository structure.`;
  }

  protected async setupSession(): Promise<Session> {
    try {
      return await this.copilot.createSession({
        model: process.env.COPILOT_MODEL || "gpt-4.1",
        streaming: true,
        tools: getAllTools(),
        mcpServers: process.env.COPILOT_ENABLE_MCP === "true" ? {
          github: {
            type: "http",
            url: "https://api.github.com/mcp/",
          },
        } : undefined,
      });
    } catch (error) {
      throw new Error(`Failed to create Copilot session: ${error}`);
    }
  }

  protected async executeWorkflow(
    prompt: string,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    try {
      const session = await this.setupSession();

      let output = "";
      let hasError = false;
      let errorMessage = "";

      // Listen for session events
      session.on((event: SessionEvent) => {
        console.log(`[${context.taskId}] Event:`, event.type);

        if (event.type === "tool.start") {
          const toolName = event.data?.toolName || "unknown";
          this.sendProgress(
            context.taskId,
            `Executing: ${toolName}`,
            0.3
          ).catch(console.error);
        }

        if (event.type === "tool.end") {
          const result = event.data?.result;
          console.log(`[${context.taskId}] Tool result:`, result);
        }

        if (event.type === "assistant.message_delta") {
          output += event.data?.deltaContent || "";
        }

        if (event.type === "error") {
          hasError = true;
          errorMessage = event.data?.message || "Unknown error";
        }
      });

      // Send the workflow prompt
      await session.sendAndWait({ prompt });

      if (hasError) {
        return {
          success: false,
          error: errorMessage,
          output,
        };
      }

      return {
        success: true,
        output,
        summary: "Workflow completed successfully",
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    throw new Error("execute() must be implemented by subclasses");
  }
}
