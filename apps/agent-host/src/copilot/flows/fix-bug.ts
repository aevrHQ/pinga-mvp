// Fix Bug Workflow
// Automatically diagnoses and fixes bugs in a repository
import { WorkflowExecutor, WorkflowContext, WorkflowResult } from "./base.js";

export class FixBugWorkflow extends WorkflowExecutor {
  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    try {
      await this.sendProgress(
        context.taskId,
        "Starting bug fix workflow",
        0.05,
        `Repository: ${context.repo}`
      );

      const systemPrompt = this.buildSystemPrompt("fix-bug", context);

      const userPrompt = `
You are tasked with fixing the following bug:

${context.naturalLanguage}

${context.context?.errorMessage ? `Error details: ${context.context.errorMessage}` : ""}
${context.context?.stackTrace ? `Stack trace: ${context.context.stackTrace}` : ""}
${context.context?.testName ? `Failing test: ${context.context.testName}` : ""}

Follow these steps:
1. Clone the repository to a temporary location
2. List important files in the repository (src/, tests/, etc)
3. Examine the error location and related code
4. Identify the root cause
5. Create a feature branch: fix/bug-<timestamp>
6. Apply the fix to the code
7. Run tests to verify the fix works
8. Commit the changes with a clear message
9. Push the branch
10. Create a pull request with:
    - Title: "Fix: <bug description>"
    - Body: Description of the bug and how it was fixed
    - Labels: ["bug", "fix"]
11. Send final progress update with the PR URL

After each major step, use send_progress_update to notify the user.
If at any point you need user clarification, explain what's blocking you.
`;

      const result = await this.executeWorkflow(
        `${systemPrompt}\n\n${userPrompt}`,
        context
      );

      if (result.success) {
        await this.sendProgress(
          context.taskId,
          "Bug fix complete",
          1.0,
          result.summary
        );
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.sendCompletion(context.taskId, {
        success: false,
        error: errorMsg,
      });

      return {
        success: false,
        error: errorMsg,
      };
    }
  }
}
