import express, { Express, Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { CommandRequest, CommandResponse } from "./types.js";
import PingaClient from "./pinga/client.js";
import JobQueue from "./queue/processor.js";

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

// Command handler (placeholder - will call actual workflow)
async function handleCommand(command: CommandRequest): Promise<void> {
  console.log(`\n📋 Processing command: ${command.taskId}`);
  console.log(`   Intent: ${command.payload.intent}`);
  console.log(`   Repo: ${command.payload.repo}`);
  console.log(`   Description: ${command.payload.naturalLanguage}`);

  jobQueue.updateJobStatus(command.taskId, "processing");

  // TODO: Implement actual workflow handling based on intent
  // For now, just send a progress update

  await pingaClient.sendProgressUpdate({
    taskId: command.taskId,
    status: "in_progress",
    step: "Initializing Copilot session",
    progress: 0.1,
  });

  // Simulate processing
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await pingaClient.notifyCompletion(command.taskId, {
    summary: "Task received and queued. Workflow implementation coming soon.",
  });

  jobQueue.updateJobStatus(command.taskId, "completed");
}
