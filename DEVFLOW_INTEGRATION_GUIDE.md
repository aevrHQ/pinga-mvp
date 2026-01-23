# Devflow - Complete Integration Guide

## Overview

Devflow is an AI-powered DevOps agent accessible through Telegram and Slack. Users can execute complex development tasks via simple `!devflow` commands, which are handled by the Agent Host and powered by GitHub Copilot SDK.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Telegram / Slack User                        │
│              "!devflow fix owner/repo Bug in auth"              │
└────────────────────────────┬──────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Pinga Web Application                        │
│  ├─ /webhook/telegram - Telegram message handler              │
│  ├─ /webhook/slack    - Slack message handler                 │
│  ├─ /api/copilot/command - Command forwarder                  │
│  └─ /api/copilot/task-update - Progress relay                 │
└────────────────────────────┬──────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Devflow Agent Host                             │
│  ├─ /command - Receive tasks                                   │
│  ├─ WorkflowFactory - Route to appropriate workflow            │
│  ├─ Tools - git, tests, files, github, progress               │
│  └─ Workflows - fix-bug, feature, explain, review-pr           │
└────────────────────────────┬──────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│              GitHub Copilot SDK (When Available)               │
│  - AI orchestration of tools                                   │
│  - Intelligent decision making                                 │
│  - MCP server integration                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### Prerequisites

- Node.js 20+
- GitHub Personal Access Token with repo scope
- Telegram Bot Token (if using Telegram)
- Slack Bot Token (if using Slack)

### 1. Clone and Install

```bash
git clone https://github.com/aevrHQ/pinga-mvp.git
cd pinga-mvp

# Install root dependencies
npm install

# Install workspace dependencies
npm install --workspaces
```

### 2. Configure Pinga Web App

Edit `apps/web/.env.local`:

```bash
# Existing configurations...

# Devflow Integration
DEVFLOW_API_SECRET=your-secret-here
AGENT_HOST_URL=http://localhost:3001
NEXT_PUBLIC_PINGA_URL=http://localhost:3000
```

### 3. Configure Agent Host

Edit `apps/agent-host/.env.local`:

```bash
# GitHub Configuration
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-github-username

# Pinga Integration
PINGA_API_URL=http://localhost:3000
PINGA_API_SECRET=your-secret-here

# Server Configuration
PORT=3001
NODE_ENV=development

# Copilot Configuration
COPILOT_MODEL=gpt-4.1
COPILOT_ENABLE_MCP=true
```

### 4. Start Services

```bash
# Terminal 1: Start Pinga
cd apps/web
npm run dev
# Runs on http://localhost:3000

# Terminal 2: Start Agent Host
cd apps/agent-host
npm run dev
# Runs on http://localhost:3001
```

## Usage

### Command Format

```
!devflow <intent> <repo> [branch] <description>
```

### Intents Available

- `fix` or `fix-bug` - Automatically fix bugs in code
- `feature` - Implement new features
- `explain` - Explain code and architecture
- `review-pr` - Review pull requests
- `deploy` - Deploy applications (planned)

### Examples

```
# Fix a bug
!devflow fix owner/repo Fix the authentication timeout

# Implement a feature
!devflow feature owner/repo Add CSV export functionality

# Explain code
!devflow explain owner/repo Explain the authentication flow

# Review a PR
!devflow review-pr owner/repo Review PR #123

# Specify branch
!devflow fix owner/repo main Fix the deployment script
```

## How It Works

### Step 1: Command Detection

When a user sends `!devflow fix owner/repo Fix the bug`:

1. Pinga webhook handler receives the message
2. Calls `parseDevflowCommand()` utility
3. Extracts: intent="fix-bug", repo="owner/repo", description="Fix the bug"
4. Generates unique taskId: `crypto.randomUUID()`

### Step 2: Task Submission

1. Validates command has intent and repo
2. Creates request object:
   ```json
   {
     "taskId": "uuid-here",
     "source": { "channel": "telegram", "chatId": "123", "messageId": "456" },
     "payload": {
       "intent": "fix-bug",
       "repo": "owner/repo",
       "naturalLanguage": "Fix the bug"
     }
   }
   ```
3. Forwards to Agent Host `/command` endpoint
4. Stores mapping: taskId → {chatId, channel}

### Step 3: Workflow Execution

1. Agent Host `/command` receives request
2. Creates `WorkflowContext`
3. Calls `WorkflowFactory.executeWorkflow(context)`
4. Routes to `FixBugWorkflow` (or appropriate workflow)
5. Workflow executes:
   - Builds system prompt for Copilot
   - Creates session with tools
   - Sends workflow prompt to AI
   - Listens to session events

### Step 4: Tool Execution

The AI orchestrates tools:

1. `git_operations.clone()` - Clone repo to /tmp/devflow-repos/
2. `read_file()` - Read source files to understand bug
3. `write_file()` - Apply fix to files
4. `run_tests()` - Verify fix doesn't break tests
5. `git_operations.commit()` - Commit changes
6. `git_operations.push()` - Push to feature branch
7. `open_pull_request()` - Create PR with details
8. `send_progress_update()` - Notify user at each step

### Step 5: Progress Updates

During execution, tools call `send_progress_update()`:

```json
{
  "taskId": "uuid-here",
  "status": "in_progress",
  "step": "Running tests...",
  "progress": 0.75,
  "details": "Testing auth module..."
}
```

This POST to Pinga's `/api/copilot/task-update`:

1. Receives progress update
2. Looks up taskId mapping
3. Formats message with progress bar: `[████████░░] 75%`
4. Sends formatted message to Telegram/Slack
5. User sees: `⏳ Running tests... [████████░░] 75%`

### Step 6: Completion

On completion:

```json
{
  "taskId": "uuid-here",
  "status": "completed",
  "step": "Task completed!",
  "progress": 1.0,
  "details": "PR created: https://github.com/owner/repo/pull/123"
}
```

User receives: `✅ Task completed! PR created: https://github.com/owner/repo/pull/123`

## Troubleshooting

### Command Not Recognized

**Issue**: User sends `!devflow fix ...` but nothing happens

**Solution**:
1. Check that Pinga webhook is receiving messages
2. Verify DEVFLOW_API_SECRET is set correctly in both apps
3. Check Pinga logs for errors

### Task Timeout

**Issue**: Task takes too long or doesn't complete

**Solution**:
1. Check Agent Host logs for tool errors
2. Verify GitHub token has proper permissions
3. Check network connectivity between services

### Progress Updates Not Showing

**Issue**: User doesn't see progress updates in chat

**Solution**:
1. Verify `send_progress_update` tool is being called
2. Check Pinga `/api/copilot/task-update` logs
3. Ensure X-API-Secret header matches

## API Endpoints

### Pinga

**POST /api/copilot/command**

Forward devflow command to Agent Host.

```bash
curl -X POST http://localhost:3000/api/copilot/command \
  -H "X-API-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "unique-id",
    "source": { "channel": "telegram", "chatId": "123", "messageId": "1" },
    "payload": {
      "intent": "fix-bug",
      "repo": "owner/repo",
      "naturalLanguage": "Fix the bug"
    }
  }'
```

**POST /api/copilot/task-update**

Receive progress updates from Agent Host and relay to chat.

```bash
curl -X POST http://localhost:3000/api/copilot/task-update \
  -H "X-API-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "unique-id",
    "status": "in_progress",
    "step": "Cloning repository...",
    "progress": 0.1
  }'
```

### Agent Host

**POST /command**

Receive task from Pinga and execute workflow.

```bash
curl -X POST http://localhost:3001/command \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "unique-id",
    "source": { "channel": "telegram", "chatId": "123", "messageId": "1" },
    "payload": {
      "intent": "fix-bug",
      "repo": "owner/repo",
      "naturalLanguage": "Fix the bug"
    }
  }'
```

**GET /health**

Health check endpoint.

```bash
curl http://localhost:3001/health
# {"status":"healthy","timestamp":"...","uptime":...}
```

## Security

### API Secret

Both Pinga and Agent Host use `DEVFLOW_API_SECRET` for authentication:

- Required header: `X-API-Secret`
- Must match environment variable
- Should be a strong, random string
- Never commit to version control

### GitHub Token

- Use a Personal Access Token with `repo` scope only
- Store securely in environment variables
- Rotate periodically
- Use different tokens for dev/prod

### Network Security

- In production, run on HTTPS
- Use environment-specific secrets
- Implement rate limiting
- Log all API access

## Monitoring & Logging

### Check Pinga Logs

```bash
cd apps/web
npm run dev

# Watch for:
# [Telegram Webhook] ...
# [Copilot Command] ...
# [Copilot] Task Update: ...
```

### Check Agent Host Logs

```bash
cd apps/agent-host
npm run dev

# Watch for:
# 📋 Processing command: ...
# [FixBugWorkflow] ...
```

### Enable Debug Logging

Set in `.env.local`:

```bash
DEBUG=*
```

## Performance

- **Workflow execution**: 5-30 minutes (depending on complexity)
- **Test execution**: 1-5 minutes
- **Progress update latency**: < 100ms
- **API response time**: < 200ms

## Limitations (MVP)

- Task mappings stored in memory (restart loses mappings)
- Only one concurrent task per deployment
- No retry logic for failed tools
- No user authentication beyond HMAC secret

## Future Enhancements

- Database-backed task tracking
- Concurrent task execution
- Automatic retries
- User authentication & authorization
- Webhooks for external services
- Custom skill marketplace
- Multi-workspace support

## Support

For issues or questions:
1. Check logs in both applications
2. Review error messages in chat
3. Verify environment variables
4. Test endpoints with curl first

## License

MIT
