// Code Explanation Workflow
// Explains code, architecture, or specific features
import { WorkflowExecutor, WorkflowContext, WorkflowResult } from "./base.js";

export class ExplainWorkflow extends WorkflowExecutor {
  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    try {
      await this.sendProgress(
        context.taskId,
        "Starting code explanation workflow",
        0.05
      );

      const systemPrompt = `You are Devflow, an expert code explanation assistant.

Your task: Provide clear, comprehensive explanations of code, architecture, or features.
Repository: ${context.repo}
Request: ${context.naturalLanguage}

You have access to these tools:
- git_operations: Clone repositories
- read_file: Read source code files
- list_files: List files in the repository
- send_progress_update: Send updates to the user

IMPORTANT:
1. Clone the repository first
2. Examine the relevant code files
3. Provide clear, well-structured explanations
4. Include code examples where helpful
5. Explain design patterns and architectural decisions
6. Mention dependencies and how they're used
7. Send progress updates as you explore
`;

      const userPrompt = `
Please explain the following:

${context.naturalLanguage}

${context.context?.files ? `Focus on these files:\n${context.context.files}` : ""}
${context.context?.focusArea ? `Focus area: ${context.context.focusArea}` : ""}

Follow these steps:
1. Clone the repository
2. List the directory structure to understand the layout
3. Identify the relevant files for this explanation
4. Read and analyze the code
5. Provide a comprehensive explanation that includes:
   - What the code does
   - How it works
   - Key components and their relationships
   - Important design decisions
   - Dependencies and external integrations
   - Examples of usage
6. Send a progress update with the complete explanation

Format your explanation clearly with:
- Headings for different sections
- Code snippets for important parts
- Clear descriptions of flow and logic
- Diagrams or ASCII art if helpful (use markdown code blocks)
`;

      const result = await this.executeWorkflow(
        `${systemPrompt}\n\n${userPrompt}`,
        context
      );

      if (result.success) {
        await this.sendProgress(
          context.taskId,
          "Explanation complete",
          1.0,
          "Code explanation has been prepared and sent"
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
