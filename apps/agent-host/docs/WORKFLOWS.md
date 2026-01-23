# Devflow Workflow Implementations

Workflows that orchestrate custom tools to perform complex development tasks.

## Workflow Architecture

```
WorkflowExecutor (base class)
├── FixBugWorkflow      - Diagnose and fix bugs automatically
├── FeatureWorkflow     - Implement new features
├── ExplainWorkflow     - Explain code and architecture
├── ReviewPRWorkflow    - Review pull requests
└── [Deploy] (TODO)     - Deploy applications
```

## Base Workflow Class (`flows/base.ts`)

All workflows extend `WorkflowExecutor` which provides:

```typescript
export class WorkflowExecutor {
  protected async sendProgress(taskId, step, progress, details?);
  protected async sendCompletion(taskId, result);
  protected buildSystemPrompt(intent, context): string;
  protected async setupSession(): Promise<Session>;
  protected async executeWorkflow(prompt, context): Promise<WorkflowResult>;
  async execute(context): Promise<WorkflowResult>; // Override in subclass
}
```

### Key Methods

- **sendProgress()** - Update user in real-time via Pinga
- **sendCompletion()** - Notify success or failure
- **buildSystemPrompt()** - Build Copilot system instructions
- **setupSession()** - Create Copilot session with tools & MCP
- **executeWorkflow()** - Execute Copilot session and handle events
- **execute()** - Subclass implementation for specific workflow

---

## 1. Fix Bug Workflow

Automatically diagnoses and fixes bugs in a repository.

**File**: `flows/fix-bug.ts`

**Process**:
1. Clone the repository
2. Examine error location and related code
3. Identify the root cause
4. Create `fix/bug-<timestamp>` branch
5. Apply the fix
6. Run tests to verify
7. Commit and push changes
8. Create PR with fix details and labels

**Input Context**:
```typescript
{
  naturalLanguage: "Authentication fails when token expires",
  context: {
    errorMessage: "...",
    stackTrace: "...",
    testName: "AuthService.spec.ts"
  }
}
```

**Output**:
```typescript
{
  success: true,
  prUrl: "https://github.com/owner/repo/pull/123",
  summary: "Fixed authentication bug with token refresh"
}
```

**Tools Used**:
- git_operations (clone, branch, commit, push)
- read_file (examine code)
- write_file (apply fix)
- run_tests (verify fix)
- open_pull_request (create PR)
- send_progress_update (notify user)

---

## 2. Feature Implementation Workflow

Automatically implements new features in a repository.

**File**: `flows/feature.ts`

**Process**:
1. Clone the repository
2. Explore repository structure
3. Create `feature/<feature-name>` branch
4. Implement the feature
5. Add tests
6. Run tests to ensure quality
7. Commit and push changes
8. Create PR with feature description and enhancement label

**Input Context**:
```typescript
{
  naturalLanguage: "Add user export to CSV functionality",
  context: {
    requirements: "...",
    acceptance: "...",
    files: "UserService.ts, UserController.ts"
  }
}
```

**Output**:
```typescript
{
  success: true,
  prUrl: "https://github.com/owner/repo/pull/124",
  summary: "Implemented CSV export feature with tests"
}
```

**Tools Used**:
- git_operations (clone, branch, commit, push)
- read_file (understand architecture)
- list_files (explore codebase)
- write_file (create/modify files)
- run_tests (ensure quality)
- open_pull_request (create PR)
- send_progress_update (notify user)

---

## 3. Code Explanation Workflow

Explains code, architecture, or specific features.

**File**: `flows/explain.ts`

**Process**:
1. Clone the repository
2. List directory structure
3. Identify relevant files
4. Examine and analyze code
5. Provide comprehensive explanation including:
   - What the code does
   - How it works
   - Key components and relationships
   - Design decisions
   - Dependencies
   - Usage examples
6. Send explanation via progress update

**Input Context**:
```typescript
{
  naturalLanguage: "Explain the authentication flow",
  context: {
    files: "AuthService.ts, JWTMiddleware.ts",
    focusArea: "Token validation and refresh"
  }
}
```

**Output**:
```typescript
{
  success: true,
  output: "Complete explanation with code snippets and diagrams",
  summary: "Authentication flow explained"
}
```

**Tools Used**:
- git_operations (clone)
- read_file (examine code)
- list_files (explore structure)
- send_progress_update (send explanation)

---

## 4. PR Review Workflow

Reviews pull requests and provides constructive feedback.

**File**: `flows/review-pr.ts`

**Process**:
1. Clone the repository
2. Checkout the PR branch
3. List modified files
4. Examine each modified file
5. Analyze for:
   - Code style and consistency
   - Potential bugs
   - Security vulnerabilities
   - Performance concerns
   - Test coverage
   - Documentation
6. Provide detailed review with:
   - Summary of changes
   - Overall assessment
   - Specific issues (with severity)
   - Suggestions for improvement
   - Positive feedback

**Input Context**:
```typescript
{
  naturalLanguage: "Review this authentication PR",
  context: {
    prNumber: 123,
    branch: "feat/oauth2",
    focusAreas: "Security, backwards compatibility"
  }
}
```

**Output**:
```typescript
{
  success: true,
  output: "Detailed review with findings and suggestions",
  summary: "PR review complete with 2 blocker issues"
}
```

**Tools Used**:
- git_operations (clone, checkout)
- read_file (examine changes)
- list_files (see modified files)
- send_progress_update (send review)

---

## Workflow Context

All workflows receive a `WorkflowContext`:

```typescript
interface WorkflowContext {
  taskId: string;                    // Unique identifier
  intent: "fix-bug" | "feature" | "explain" | "review-pr" | "deploy";
  repo: string;                      // owner/repo format
  branch?: string;                   // Optional: specific branch
  naturalLanguage: string;           // User's request
  context?: Record<string, any>;     // Additional context
  source: {                          // Where command came from
    channel: "telegram" | "slack";
    chatId: string;
    messageId: string;
  };
}
```

---

## Workflow Result

All workflows return a `WorkflowResult`:

```typescript
interface WorkflowResult {
  success: boolean;
  output?: string;        // Detailed output or explanation
  prUrl?: string;         // PR URL if created
  summary?: string;       // User-friendly summary
  error?: string;         // Error message if failed
}
```

---

## Workflow Factory

Use `WorkflowFactory` to execute workflows:

```typescript
import { WorkflowFactory, WorkflowContext } from "./copilot/flows/index.js";

const context: WorkflowContext = {
  taskId: "task-123",
  intent: "fix-bug",
  repo: "owner/repo",
  naturalLanguage: "Fix authentication bug",
  source: { channel: "telegram", chatId: "...", messageId: "..." }
};

const result = await WorkflowFactory.executeWorkflow(context);

if (result.success) {
  console.log(`✅ PR created: ${result.prUrl}`);
} else {
  console.log(`❌ Failed: ${result.error}`);
}
```

---

## Event Streaming

Workflows listen to Copilot session events for real-time updates:

```typescript
session.on((event: SessionEvent) => {
  if (event.type === "tool.start") {
    // Tool execution started
    sendProgress(`Executing ${event.data.toolName}`);
  }
  
  if (event.type === "tool.end") {
    // Tool completed
    console.log(`Tool result:`, event.data.result);
  }
  
  if (event.type === "assistant.message_delta") {
    // Streaming response chunk
    output += event.data.deltaContent;
  }
  
  if (event.type === "error") {
    // Error occurred
    hasError = true;
    errorMessage = event.data.message;
  }
});
```

---

## Error Handling

Workflows handle errors gracefully:

1. **Tool Errors** - Caught during tool execution
2. **Session Errors** - Caught during Copilot interaction
3. **Network Errors** - Caught during API calls

All errors are reported back to user via:
- `sendCompletion(taskId, { success: false, error: msg })`
- Sends error notification to Pinga
- User receives notification in Slack/Telegram

---

## Integration with Server

The main server dispatches requests to workflows:

```typescript
// apps/agent-host/src/index.ts
async function handleCommand(command: CommandRequest): Promise<void> {
  const context: WorkflowContext = {
    taskId: command.taskId,
    intent: command.payload.intent,
    repo: command.payload.repo,
    // ...
  };

  const result = await WorkflowFactory.executeWorkflow(context);
  // Result sent to user via Pinga
}
```

---

## Future Workflows

### Deploy Workflow (Planned)
- Deploy to Vercel/Netlify
- Run health checks
- Rollback on failure
- Notify on completion

### Test Optimization Workflow (Planned)
- Analyze test suite
- Identify slow tests
- Suggest optimizations
- Parallel test execution

### Documentation Generation (Planned)
- Analyze codebase
- Generate API docs
- Create architecture diagrams
- Update README

---

## Testing Workflows

To test a workflow manually:

```bash
# 1. Start the server
npm run dev

# 2. Send a command
curl -X POST http://localhost:3001/command \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test-123",
    "source": { "channel": "telegram", "chatId": "123" },
    "payload": {
      "intent": "fix-bug",
      "repo": "owner/repo",
      "naturalLanguage": "Fix the auth bug"
    }
  }'

# 3. Check job status
curl http://localhost:3001/job/test-123
```

---

## Notes

- Workflows are asynchronous and long-running
- Progress updates are sent in near-real-time
- Each tool call is logged for debugging
- Repositories are cloned to `/tmp/devflow-repos/`
- Git author is set to Copilot for commits
- All changes are pushed to feature branches first (safe)
