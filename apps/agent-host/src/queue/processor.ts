import { CommandRequest } from "../types.js";

interface QueuedJob {
  id: string;
  request: CommandRequest;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

class JobQueue {
  private jobs: Map<string, QueuedJob> = new Map();
  private processing = false;

  enqueue(request: CommandRequest): void {
    const job: QueuedJob = {
      id: request.taskId,
      request,
      status: "pending",
      createdAt: Date.now(),
    };
    this.jobs.set(request.taskId, job);
    this.processNext();
  }

  getJob(taskId: string): QueuedJob | undefined {
    return this.jobs.get(taskId);
  }

  updateJobStatus(
    taskId: string,
    status: QueuedJob["status"],
    error?: string
  ): void {
    const job = this.jobs.get(taskId);
    if (job) {
      job.status = status;
      if (status === "processing") {
        job.startedAt = Date.now();
      }
      if (status === "completed" || status === "failed") {
        job.completedAt = Date.now();
      }
      if (error) {
        job.error = error;
      }
    }
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;

    const pendingJob = Array.from(this.jobs.values()).find(
      (j) => j.status === "pending"
    );

    if (!pendingJob) return;

    this.processing = true;

    try {
      this.updateJobStatus(pendingJob.id, "processing");
      // Job processing will be handled by the route handler
      // This queue just tracks job state
    } finally {
      this.processing = false;
      this.processNext(); // Process next job in queue
    }
  }
}

export default JobQueue;
