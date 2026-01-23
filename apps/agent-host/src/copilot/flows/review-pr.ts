// Pull Request Review Workflow
// Reviews pull requests and provides feedback
import { WorkflowExecutor, WorkflowContext, WorkflowResult } from "./base.js";

export class ReviewPRWorkflow extends WorkflowExecutor {
  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    try {
      await this.sendProgress(
        context.taskId,
        "Starting PR review workflow",
        0.05,
        `Repository: ${context.repo}`
      );

      const systemPrompt = `You are Devflow, an expert code reviewer.

Your task: Review pull requests and provide constructive feedback
Repository: ${context.repo}
Review Request: ${context.naturalLanguage}

You have access to these tools:
- git_operations: Clone and checkout branches
- read_file: Examine code changes
- list_files: List modified files
- send_progress_update: Send updates to the user

IMPORTANT:
1. Clone the repository
2. List and examine all modified files
3. Provide constructive feedback
4. Identify potential issues and improvements
5. Acknowledge good practices
6. Send detailed review comments
`;

      const userPrompt = `
Please review this pull request:

${context.naturalLanguage}

${context.context?.prNumber ? `PR Number: #${context.context.prNumber}` : ""}
${context.context?.branch ? `Branch: ${context.context.branch}` : ""}
${context.context?.focusAreas ? `Focus areas: ${context.context.focusAreas}` : ""}

Follow these steps:
1. Clone the repository
2. Checkout the pull request branch (or fetch it)
3. List the modified files to understand the scope
4. Examine each modified file to understand the changes
5. Look for:
   - Code style and consistency issues
   - Potential bugs or logic errors
   - Security vulnerabilities
   - Performance concerns
   - Test coverage
   - Documentation updates
   - Breaking changes
6. Provide a comprehensive review that includes:
   - Summary of the changes
   - Overall assessment
   - Specific issues (if any)
   - Suggestions for improvement
   - Positive feedback on good practices
7. Send a progress update with the review feedback

Format your review clearly with:
- Clear issue descriptions
- Specific file and line references
- Code snippets showing the issue
- Suggested improvements
- Severity levels (blocker, major, minor, nitpick)
`;

      const result = await this.executeWorkflow(
        `${systemPrompt}\n\n${userPrompt}`,
        context
      );

      if (result.success) {
        await this.sendProgress(
          context.taskId,
          "PR review complete",
          1.0,
          "Review feedback has been prepared"
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
