import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { CommandRequest, CommandResponse } from "./types.js";
import PingaClient from "./pinga/client.js";
import JobQueue from "./queue/processor.js";
import { WorkflowFactory, WorkflowContext } from "./copilot/flows/index.js";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Initialize clients
const pingaClient = new PingaClient(
  process.env.PINGA_API_URL || "http://localhost:3000",
  process.env.PINGA_API_SECRET || ""
);

const jobQueue = new JobQueue();

// Request validation middleware
const validateCommand = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId, source, payload } = req.body as CommandRequest;

    if (!taskId || !source || !payload) {
      return res.status(400).json({
        error: "Missing required fields: taskId, source, payload",
      });
    }

    if (!source.channel || !source.chatId) {
      return res.status(400).json({
        error: "Missing required source fields: channel, chatId",
      });
    }

    if (!payload.intent || !payload.repo || !payload.naturalLanguage) {
      return res.status(400).json({
        error: "Missing required payload fields: intent, repo, naturalLanguage",
      });
    }

    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid request body" });
  }
};

// Routes

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Receive command from Pinga
app.post("/command", validateCommand, (req: Request, res: Response) => {
  const command = req.body as CommandRequest;

  try {
    // Queue the job
    jobQueue.enqueue(command);

    const response: CommandResponse = {
      accepted: true,
      taskId: command.taskId,
    };

    res.status(202).json(response);

    // Process asynchronously
    handleCommand(command).catch((error) => {
      console.error(`Error processing command ${command.taskId}:`, error);
      pingaClient.notifyError(command.taskId, error.message).catch(console.error);
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      accepted: false,
      taskId: command.taskId,
      error: errorMessage,
    });
  }
});

// Get job status
app.get("/job/:taskId", (req: Request, res: Response) => {
  const job = jobQueue.getJob(req.params.taskId);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json({
    taskId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
  });
});

// Execute workflow (called by CLI agent)
app.post("/api/workflows/execute", (req: Request, res: Response) => {
  const { taskId, intent, repo, branch, naturalLanguage } = req.body;

  if (!taskId || !intent || !repo || !naturalLanguage) {
    return res.status(400).json({
      error: "Missing required fields: taskId, intent, repo, naturalLanguage",
    });
  }

  try {
    // Accept the request immediately
    res.status(202).json({
      accepted: true,
      taskId,
    });

    // Process asynchronously
    (async () => {
      try {
        const context: WorkflowContext = {
          taskId,
          intent,
          repo,
          branch,
          naturalLanguage,
          source: {
            channel: "cli",
            chatId: "local",
            messageId: taskId,
          },
        };

        console.log(`\n🚀 Executing workflow via API: ${taskId}`);
        const result = await WorkflowFactory.executeWorkflow(context);
        console.log(`✓ Workflow completed: ${taskId}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`✗ Workflow failed: ${taskId} - ${errorMsg}`);
      }
    })();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Failed to execute workflow",
      message: errorMessage,
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
app.listen(port, () => {
  console.log(
    `🚀 Devflow Agent Host listening on http://localhost:${port}`
  );
  console.log(`📊 Health check: http://localhost:${port}/health`);
});

// Command handler - dispatches to appropriate workflow
async function handleCommand(command: CommandRequest): Promise<void> {
  console.log(`\n📋 Processing command: ${command.taskId}`);
  console.log(`   Intent: ${command.payload.intent}`);
  console.log(`   Repo: ${command.payload.repo}`);
  console.log(`   Description: ${command.payload.naturalLanguage}`);

  jobQueue.updateJobStatus(command.taskId, "processing");

  try {
    // Build workflow context
    const context: WorkflowContext = {
      taskId: command.taskId,
      intent: command.payload.intent,
      repo: command.payload.repo,
      branch: command.payload.branch,
      naturalLanguage: command.payload.naturalLanguage,
      context: command.payload.context,
      source: command.source,
    };

    // Execute the workflow
    const result = await WorkflowFactory.executeWorkflow(context);

    if (result.success) {
      jobQueue.updateJobStatus(command.taskId, "completed");
    } else {
      jobQueue.updateJobStatus(command.taskId, "failed", result.error);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    jobQueue.updateJobStatus(command.taskId, "failed", errorMsg);

    await pingaClient.notifyError(command.taskId, errorMsg);
  }
}
