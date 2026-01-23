# Devflow - AI DevOps Agent Host

## Project Overview

I'm building **Devflow**, an AI-powered DevOps agent that receives commands from Slack/Telegram (via my existing Pinga notification system) and uses GitHub Copilot SDK to perform development operations like fixing bugs, implementing features, explaining codebases, running tests, and opening PRs.

This is for the **GitHub Copilot CLI Challenge** (deadline: Feb 15, 2025).

---

## Architecture

```
Slack/Telegram
     ↓ (user sends: !devflow fix "bug description")
Pinga Web App (Vercel - existing)
     ↓ HTTP POST /command
Devflow Agent Host (new - this project)
     ├─ GitHub Copilot SDK Client
     ├─ Custom Tools (git, tests, deploy, etc.)
     ├─ GitHub MCP Server integration
     └─ Skills integration
     ↓ HTTP POST /task-update (progress updates)
Pinga (relays to Slack/Telegram)
```

---

## Existing Pinga Context

### What Pinga Does

- Receives webhooks from sources (GitHub, Render, Vercel, etc.)
- Analyzes and formats them using AI
- Sends notifications to channels (Telegram, Slack, Discord)
- Has AI chat assistant that responds in channels
- Multi-tenant, passwordless auth, MongoDB storage

### Relevant Pinga Code Structure

```
apps/web/
  ├── app/api/webhook/
  │   ├── telegram/route.ts    # Telegram webhook handler
  │   ├── slack/route.ts        # Slack webhook handler
  │   └── [source]/route.ts     # Generic webhook receiver
  ├── lib/
  │   ├── agents/
  │   │   ├── chatAssistant.ts  # Conversational AI agent
  │   │   ├── eventSummary.ts   # Webhook summarizer
  │   │   └── tools.ts          # Tool definitions
  │   ├── notification/
  │   │   ├── channels/         # Telegram, Slack, Discord clients
  │   │   └── service.ts        # Notification orchestration
  │   └── webhook/
  │       ├── analyzers/        # Source detection logic
  │       └── telegram.ts       # Telegram message handling
  └── models/
      ├── User.ts
      ├── Channel.ts
      └── WebhookEvent.ts
```

### Pinga Integration Points

1. **Command Detection**: Pinga already handles Telegram/Slack messages
2. **API Communication**: Pinga will call Devflow Agent Host's `/command` endpoint
3. **Update Streaming**: Devflow will call Pinga's `/api/copilot/task-update` endpoint

---

## GitHub Copilot SDK Context

### What the SDK Provides

The GitHub Copilot SDK is a **programmable agent runtime** that wraps the Copilot CLI. Key capabilities:

1. **Session Management**: Create AI sessions with specific models and configurations
2. **Streaming**: Real-time event streaming for progress updates
3. **Custom Tools**: Define TypeScript/Python functions that Copilot can call
4. **MCP Servers**: Connect to Model Context Protocol servers (like GitHub's) for extended capabilities
5. **Skills Integration**: Use pre-built instruction sets for best practices

### SDK Installation

```bash
npm install @github/copilot-sdk
```

### SDK Core Patterns

#### 1. Basic Session

```typescript
import { CopilotClient } from "@github/copilot-sdk";

const client = new CopilotClient();
const session = await client.createSession({
  model: "gpt-4.1",
  streaming: true,
});

const response = await session.sendAndWait({
  prompt: "What is 2 + 2?",
});
```

#### 2. Event Streaming

```typescript
import { SessionEvent } from "@github/copilot-sdk";

session.on((event: SessionEvent) => {
  if (event.type === "assistant.message_delta") {
    // Streaming response chunk
    console.log(event.data.deltaContent);
  }
  if (event.type === "tool.start") {
    // Tool execution started
    console.log(`Running tool: ${event.data.toolName}`);
  }
  if (event.type === "tool.end") {
    // Tool execution completed
    console.log(`Tool result:`, event.data.result);
  }
  if (event.type === "session.idle") {
    // Session completed
  }
});
```

#### 3. Custom Tools (THE CRITICAL FEATURE)

```typescript
import { defineTool } from "@github/copilot-sdk";

const runTests = defineTool("run_tests", {
  description: "Run tests for a repository",
  parameters: {
    type: "object",
    properties: {
      repo: { type: "string", description: "Repository path" },
      testPattern: { type: "string", description: "Test file pattern" },
    },
    required: ["repo"],
  },
  handler: async (args: { repo: string; testPattern?: string }) => {
    // Execute actual test commands here
    const { execSync } = require("child_process");
    const result = execSync(`cd ${args.repo} && npm test`, {
      encoding: "utf-8",
    });
    return { success: true, output: result };
  },
});

// Use in session
const session = await client.createSession({
  tools: [runTests],
});
```

#### 4. GitHub MCP Server Integration

```typescript
const session = await client.createSession({
  model: "gpt-4.1",
  mcpServers: {
    github: {
      type: "http",
      url: "https://api.githubcopilot.com/mcp/",
    },
  },
});

// Now Copilot can access repos, issues, PRs via GitHub MCP
```

#### 5. Skills Integration

```bash
# Install skills
npx skills add vercel-labs/agent-skills#nextjs-app-router-patterns
npx skills add logging-best-practices
npx skills add systematic-debugging
```

Then reference in prompts:

```typescript
await session.sendAndWait({
  prompt: `Fix this bug. You have these skills: logging-best-practices, systematic-debugging. Use their guidance.`,
});
```

---

## Devflow Agent Host Requirements

### Location in Monorepo

Create as: `apps/agent-host/`

### Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express or Fastify (lightweight HTTP server)
- **SDK**: `@github/copilot-sdk`
- **Git Operations**: `simple-git` npm package
- **GitHub API**: `@octokit/rest`
- **Job Queue**: `bullmq` or in-memory queue for MVP
- **Process Manager**: PM2 for production

### Core Endpoints

#### 1. `POST /command` - Receive Commands from Pinga

**Request Schema:**

```typescript
{
  taskId: string;           // Unique task identifier
  source: {
    channel: "telegram" | "slack";
    chatId: string;         // Telegram chat ID or Slack channel ID
    messageId: string;      // Original message ID for threading
  };
  payload: {
    intent: "fix-bug" | "feature" | "explain" | "review-pr" | "deploy";
    repo: string;           // e.g. "miracleonyenma/meta-ads-api"
    branch?: string;        // Optional: specific branch
    naturalLanguage: string; // The actual command description
    context?: Record<string, any>; // Additional context
  };
}
```

**Response:**

```typescript
{
  accepted: true;
  taskId: string;
}
```

**Security**: HMAC signature validation or shared secret in headers

#### 2. `GET /health` - Health Check

Simple health check for monitoring

### Custom Tools to Implement

These are the functions Copilot will call:

#### 1. Git Operations

```typescript
const gitOperations = defineTool("git_operations", {
  description: "Perform git operations like clone, branch, commit, push",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["clone", "create_branch", "commit", "push"],
        description: "Git operation to perform",
      },
      repo: { type: "string", description: "Repository URL or path" },
      branchName: { type: "string", description: "Branch name" },
      message: { type: "string", description: "Commit message" },
    },
    required: ["action", "repo"],
  },
  handler: async (args) => {
    // Use simple-git library
    // Store repos in /tmp/devflow-repos/
    // Return operation result
  },
});
```

#### 2. Run Tests

```typescript
const runTests = defineTool("run_tests", {
  description: "Run test suite for a repository",
  parameters: {
    type: "object",
    properties: {
      repoPath: { type: "string", description: "Local repository path" },
      testCommand: {
        type: "string",
        description: "Test command (default: npm test)",
      },
    },
    required: ["repoPath"],
  },
  handler: async (args) => {
    // Execute test command
    // Capture output
    // Return pass/fail + summary
  },
});
```

#### 3. Open Pull Request

```typescript
const openPullRequest = defineTool("open_pull_request", {
  description: "Open a pull request on GitHub",
  parameters: {
    type: "object",
    properties: {
      repo: { type: "string", description: "Repository (owner/name)" },
      title: { type: "string", description: "PR title" },
      body: { type: "string", description: "PR description" },
      head: { type: "string", description: "Source branch" },
      base: { type: "string", description: "Target branch (default: main)" },
    },
    required: ["repo", "title", "head"],
  },
  handler: async (args) => {
    // Use Octokit to create PR
    // Return PR URL
  },
});
```

#### 4. Send Progress Update

```typescript
const sendProgressUpdate = defineTool("send_progress_update", {
  description: "Send progress update back to Pinga for user notification",
  parameters: {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Task identifier" },
      status: {
        type: "string",
        enum: ["in_progress", "completed", "failed"],
        description: "Current status",
      },
      step: { type: "string", description: "Current step description" },
      progress: { type: "number", description: "Progress percentage (0-1)" },
      details: { type: "string", description: "Additional details" },
    },
    required: ["taskId", "status", "step"],
  },
  handler: async (args) => {
    // Call Pinga's /api/copilot/task-update endpoint
    // Pinga will relay to Slack/Telegram
  },
});
```

#### 5. Read File

```typescript
const readFile = defineTool("read_file", {
  description: "Read contents of a file from repository",
  parameters: {
    type: "object",
    properties: {
      repoPath: { type: "string", description: "Repository path" },
      filePath: {
        type: "string",
        description: "File path relative to repo root",
      },
    },
    required: ["repoPath", "filePath"],
  },
  handler: async (args) => {
    // Read file, return contents
  },
});
```

#### 6. Write File

```typescript
const writeFile = defineTool("write_file", {
  description: "Write or update a file in repository",
  parameters: {
    type: "object",
    properties: {
      repoPath: { type: "string", description: "Repository path" },
      filePath: {
        type: "string",
        description: "File path relative to repo root",
      },
      content: { type: "string", description: "File content" },
    },
    required: ["repoPath", "filePath", "content"],
  },
  handler: async (args) => {
    // Write file to disk
  },
});
```

### Workflow Implementations

#### Fix Bug Flow

```typescript
async function fixBugFlow(taskId: string, payload: any, source: any) {
  const session = await client.createSession({
    model: "gpt-4.1",
    streaming: true,
    tools: [
      gitOperations,
      runTests,
      readFile,
      writeFile,
      openPullRequest,
      sendProgressUpdate,
    ],
    mcpServers: {
      github: {
        type: "http",
        url: "https://api.githubcopilot.com/mcp/",
      },
    },
  });

  // Listen for events and stream to Pinga
  session.on((event: SessionEvent) => {
    if (event.type === "tool.start") {
      // Send progress update via tool
    }
  });

  const prompt = `
You are a software engineering agent. Fix this bug:

Repository: ${payload.repo}
Branch: ${payload.branch || "main"}
Bug Description: ${payload.naturalLanguage}

Task ID: ${taskId}

Instructions:
1. Use git_operations to clone the repo and create a fix branch
2. Use GitHub MCP to examine recent commits and issues
3. Use read_file to examine relevant code
4. Determine the fix needed
5. Use write_file to apply the fix
6. Use run_tests to verify the fix
7. Use git_operations to commit changes
8. Use open_pull_request to create a PR
9. Use send_progress_update at each major step

Available skills: logging-best-practices, systematic-debugging

Begin now.
  `;

  await session.sendAndWait({ prompt });
}
```

### Project Structure

```
apps/agent-host/
├── src/
│   ├── index.ts              # Main entry point (HTTP server)
│   ├── copilot/
│   │   ├── client.ts         # Copilot SDK client singleton
│   │   ├── tools/            # Custom tool definitions
│   │   │   ├── git.ts
│   │   │   ├── tests.ts
│   │   │   ├── github.ts
│   │   │   ├── files.ts
│   │   │   └── progress.ts
│   │   └── flows/            # Workflow implementations
│   │       ├── fix-bug.ts
│   │       ├── feature.ts
│   │       ├── explain.ts
│   │       └── review-pr.ts
│   ├── queue/
│   │   └── processor.ts      # Job queue processor
│   ├── pinga/
│   │   └── client.ts         # Pinga API client
│   └── types.ts              # TypeScript types
├── package.json
├── tsconfig.json
└── .env.example
```

### Environment Variables

```bash
# GitHub
GITHUB_TOKEN=ghp_xxx              # Personal access token
GITHUB_COPILOT_TOKEN=xxx          # If needed separately

# Pinga Integration
PINGA_API_URL=https://pinga-mvp-web.vercel.app
PINGA_API_SECRET=xxx              # Shared secret for HMAC

# Storage
REPO_STORAGE_PATH=/tmp/devflow-repos

# Server
PORT=3001
NODE_ENV=development
```

---

## Development Steps

### Phase 1: Core Infrastructure

1. Set up `apps/agent-host` with TypeScript + Express/Fastify
2. Initialize Copilot SDK client
3. Implement `/command` and `/health` endpoints
4. Set up basic job queue
5. Create Pinga client for sending updates

### Phase 2: Custom Tools

1. Implement `git_operations` tool
2. Implement `run_tests` tool
3. Implement `read_file` and `write_file` tools
4. Implement `open_pull_request` tool
5. Implement `send_progress_update` tool
6. Test each tool individually

### Phase 3: Workflows

1. Implement `fix-bug` flow
2. Implement `explain` flow
3. Implement `feature` flow
4. Add GitHub MCP server integration
5. Install and test skills

### Phase 4: Pinga Integration

1. Add command detection in Pinga's Telegram/Slack handlers
2. Call Devflow's `/command` endpoint from Pinga
3. Add `/api/copilot/task-update` endpoint in Pinga
4. Test end-to-end flow

### Phase 5: Polish & Deploy

1. Error handling and retries
2. Logging and monitoring
3. Deploy to VPS/VM
4. Create demo video
5. Write DEV.to blog post

---
