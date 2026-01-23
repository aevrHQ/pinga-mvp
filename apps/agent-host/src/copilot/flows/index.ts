// Workflow factory and orchestration
import { FixBugWorkflow } from "./fix-bug.js";
import { FeatureWorkflow } from "./feature.js";
import { ExplainWorkflow } from "./explain.js";
import { ReviewPRWorkflow } from "./review-pr.js";
import { WorkflowExecutor, WorkflowContext, WorkflowResult } from "./base.js";

export type WorkflowIntent =
  | "fix-bug"
  | "feature"
  | "explain"
  | "review-pr"
  | "deploy";

export class WorkflowFactory {
  static getWorkflow(intent: WorkflowIntent): new (
    pingaUrl: string,
    pingaSecret: string
  ) => WorkflowExecutor {
    switch (intent) {
      case "fix-bug":
        return FixBugWorkflow;
      case "feature":
        return FeatureWorkflow;
      case "explain":
        return ExplainWorkflow;
      case "review-pr":
        return ReviewPRWorkflow;
      case "deploy":
        // TODO: Implement deploy workflow
        throw new Error("Deploy workflow not yet implemented");
      default:
        throw new Error(`Unknown workflow intent: ${intent}`);
    }
  }

  static async executeWorkflow(
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    const WorkflowClass = this.getWorkflow(
      context.intent as WorkflowIntent
    );

    const pingaUrl = process.env.PINGA_API_URL || "http://localhost:3000";
    const pingaSecret = process.env.PINGA_API_SECRET || "";

    const workflow = new WorkflowClass(pingaUrl, pingaSecret);
    return await workflow.execute(context);
  }
}

// Export all workflow classes and base
export { WorkflowExecutor, WorkflowContext, WorkflowResult };
export { FixBugWorkflow };
export { FeatureWorkflow };
export { ExplainWorkflow };
export { ReviewPRWorkflow };
