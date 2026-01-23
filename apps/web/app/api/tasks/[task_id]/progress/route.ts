import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TaskAssignment from "@/models/TaskAssignment";
import { verifyAgentToken, extractToken } from "@/lib/agentAuth";

/**
 * POST /api/tasks/[task_id]/progress
 * Update task progress
 * Requires: Authorization: Bearer <token>
 * 
 * Request body:
 * {
 *   status: "in_progress" | "completed" | "failed",
 *   step: string,
 *   progress: number (0-1),
 *   details?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ task_id: string }> }
) {
  try {
    await connectDB();

    const { task_id: taskId } = await params;
    const { status, step, progress, details } = await request.json();

    // Extract and verify token
    const token = extractToken(request.headers.get("Authorization") || "");
    if (!token) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const payload = verifyAgentToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Find task and verify agent owns it
    const task = await TaskAssignment.findOne({
      taskId,
      agentId: payload.agentId,
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or not assigned to this agent" },
        { status: 404 }
      );
    }

    // Update task progress
    task.status = status || task.status;
    task.currentStep = step || task.currentStep;
    task.progress = progress ?? task.progress;
    
    if (!task.startedAt) {
      task.startedAt = new Date();
    }

    await task.save();

    return NextResponse.json(
      {
        success: true,
        task: {
          task_id: task.taskId,
          status: task.status,
          progress: task.progress,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[tasks/[task_id]/progress]", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
