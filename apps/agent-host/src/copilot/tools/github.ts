import { Octokit } from "@octokit/rest";
import { ToolError } from "./utils.js";

export interface OpenPRInput {
  repo: string; // owner/repo format
  title: string;
  body: string;
  head: string; // source branch
  base?: string; // target branch, default: main
  draft?: boolean;
  labels?: string[];
  assignees?: string[];
}

export interface OpenPRResult {
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  error?: string;
}

export interface PRInfo {
  number: number;
  title: string;
  state: string;
  url: string;
  createdAt: string;
  author: string;
}

export class GitHubPRManager {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async openPullRequest(input: OpenPRInput): Promise<OpenPRResult> {
    try {
      const [owner, repo] = input.repo.split("/");

      if (!owner || !repo) {
        throw new ToolError(
          "Invalid repo format. Use: owner/repo",
          "open_pull_request"
        );
      }

      const response = await this.octokit.pulls.create({
        owner,
        repo,
        title: input.title,
        body: input.body,
        head: input.head,
        base: input.base || "main",
        draft: input.draft || false,
      });

      // Add labels if provided
      if (input.labels && input.labels.length > 0) {
        try {
          await this.octokit.issues.addLabels({
            owner,
            repo,
            issue_number: response.data.number,
            labels: input.labels,
          });
        } catch (error) {
          console.warn(`Failed to add labels: ${error}`);
        }
      }

      // Assign users if provided
      if (input.assignees && input.assignees.length > 0) {
        try {
          await this.octokit.issues.addAssignees({
            owner,
            repo,
            issue_number: response.data.number,
            assignees: input.assignees,
          });
        } catch (error) {
          console.warn(`Failed to add assignees: ${error}`);
        }
      }

      return {
        success: true,
        prNumber: response.data.number,
        prUrl: response.data.html_url,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  async getPullRequest(
    repo: string,
    prNumber: number
  ): Promise<OpenPRResult & Partial<PRInfo>> {
    try {
      const [owner, repoName] = repo.split("/");

      const response = await this.octokit.pulls.get({
        owner,
        repo: repoName,
        pull_number: prNumber,
      });

      return {
        success: true,
        prNumber: response.data.number,
        prUrl: response.data.html_url,
        title: response.data.title,
        state: response.data.state,
        createdAt: response.data.created_at,
        author: response.data.user?.login || "unknown",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listPullRequests(
    repo: string,
    state: "open" | "closed" | "all" = "open",
    maxResults: number = 10
  ): Promise<OpenPRResult & { prs?: PRInfo[] }> {
    try {
      const [owner, repoName] = repo.split("/");

      const response = await this.octokit.pulls.list({
        owner,
        repo: repoName,
        state,
        per_page: maxResults,
      });

      const prs: PRInfo[] = response.data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        url: pr.html_url,
        createdAt: pr.created_at,
        author: pr.user?.login || "unknown",
      }));

      return {
        success: true,
        prs,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async closePullRequest(
    repo: string,
    prNumber: number
  ): Promise<OpenPRResult> {
    try {
      const [owner, repoName] = repo.split("/");

      const response = await this.octokit.pulls.update({
        owner,
        repo: repoName,
        pull_number: prNumber,
        state: "closed",
      });

      return {
        success: true,
        prNumber: response.data.number,
        prUrl: response.data.html_url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Factory function for Copilot SDK tool definition
export function createOpenPullRequestTool(
  userToken?: string,
  encryptionKey?: string
): any {
  // Support both managed SaaS (user token provided) and self-hosted (env var)
  let token = userToken;

  if (!token) {
    token = process.env.GITHUB_TOKEN;
    if (token) {
      console.log(
        "[GitHub Tool] Using GITHUB_TOKEN from environment (self-hosted mode)"
      );
    }
  } else {
    console.log("[GitHub Tool] Using provided user token (managed SaaS mode)");
  }

  if (!token) {
    throw new ToolError(
      "GITHUB_TOKEN environment variable not set and no user credentials provided. " +
        "For managed SaaS: ensure user GitHub token is configured. " +
        "For self-hosted: set GITHUB_TOKEN environment variable.",
      "github"
    );
  }

  const prManager = new GitHubPRManager(token);

  return {
    name: "open_pull_request",
    description: "Open a pull request on GitHub",
    parameters: {
      type: "object",
      properties: {
        repo: {
          type: "string",
          description: "Repository in format: owner/repo",
        },
        title: {
          type: "string",
          description: "Pull request title",
        },
        body: {
          type: "string",
          description: "Pull request description/body",
        },
        head: {
          type: "string",
          description: "Source branch name",
        },
        base: {
          type: "string",
          description: "Target branch (default: main)",
        },
        draft: {
          type: "boolean",
          description: "Create as draft PR",
          default: false,
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Labels to add to the PR",
        },
        assignees: {
          type: "array",
          items: { type: "string" },
          description: "GitHub usernames to assign to the PR",
        },
      },
      required: ["repo", "title", "body", "head"],
    },
    handler: async (input: OpenPRInput): Promise<OpenPRResult> => {
      try {
        return await prManager.openPullRequest(input);
      } catch (error) {
        if (error instanceof ToolError) throw error;
        throw new ToolError(
          `Failed to open PR: ${error}`,
          "open_pull_request"
        );
      }
    },
  };
}
