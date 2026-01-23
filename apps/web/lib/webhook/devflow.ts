// Devflow command detection and parsing
// Detects !devflow commands in Telegram/Slack messages

export interface DevflowCommand {
  isDevflow: boolean;
  intent?: "fix-bug" | "feature" | "explain" | "review-pr" | "deploy";
  description: string;
  repo?: string;
  branch?: string;
  context?: Record<string, any>;
  rawText: string;
}

export function parseDevflowCommand(text: string): DevflowCommand {
  const trimmed = text.trim();

  // Check if message starts with !devflow
  if (!trimmed.toLowerCase().startsWith("!devflow")) {
    return {
      isDevflow: false,
      description: "",
      rawText: text,
    };
  }

  // Parse the command
  const match = trimmed.match(
    /^!devflow\s+(fix-bug|fix|feature|explain|review-pr|deploy)\s+(.+)$/i
  );

  if (!match) {
    return {
      isDevflow: true,
      description: "Invalid devflow command format",
      rawText: text,
    };
  }

  const [, intentStr, description] = match;
  let intent: "fix-bug" | "feature" | "explain" | "review-pr" | "deploy";

  // Map "fix" to "fix-bug"
  if (intentStr.toLowerCase() === "fix") {
    intent = "fix-bug";
  } else {
    intent = intentStr.toLowerCase() as "feature" | "explain" | "review-pr" | "deploy";
  }

  // Parse description for repo and branch
  // Format: "repo-name [branch-name] description"
  // Example: "!devflow fix-bug owner/repo main Fix the auth bug"
  const descriptionParts = description.trim().split(/\s+/);

  let repo = "";
  let branch = "";
  let actualDescription = "";

  if (descriptionParts.length > 0) {
    // Check if first part looks like a repo (contains /)
    if (descriptionParts[0].includes("/")) {
      repo = descriptionParts[0];
      descriptionParts.shift();

      // Check if next part looks like a branch (no spaces, alphanumeric with - or _)
      if (descriptionParts.length > 0 && /^[a-zA-Z0-9\-_]+$/.test(descriptionParts[0])) {
        branch = descriptionParts[0];
        descriptionParts.shift();
      }
    }

    // Rest is the description
    actualDescription = descriptionParts.join(" ");
  }

  return {
    isDevflow: true,
    intent,
    description: actualDescription || description,
    repo: repo || undefined,
    branch: branch || undefined,
    rawText: text,
  };
}

export function extractDevflowInfo(message: string): DevflowCommand | null {
  const command = parseDevflowCommand(message);
  return command.isDevflow ? command : null;
}

// Format error message for invalid devflow commands
export function getDevflowHelpText(): string {
  return `🤖 *Devflow AI DevOps Agent*

Use these commands to automate development tasks:

*Fix Bugs*
\`!devflow fix owner/repo Fix the auth bug\`

*Implement Features*
\`!devflow feature owner/repo Add CSV export\`

*Explain Code*
\`!devflow explain owner/repo Explain authentication flow\`

*Review PRs*
\`!devflow review-pr owner/repo Provide feedback on PR #123\`

*Optional: Specify branch*
\`!devflow fix owner/repo develop Fix the bug\`

⏳ The agent will clone the repo, understand your request, and take action!
📊 You'll receive real-time progress updates as the task executes.
✅ When complete, you'll get a link to the created PR or result.`;
}
