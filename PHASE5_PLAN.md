# Phase 5: SaaS Platform + CLI Agent Implementation

## Overview

Convert current architecture into a production-ready SaaS platform where:

- Devflow Platform (web app) = `apps/web`
- Devflow Agent (CLI tool) = `apps/agent` (new)

Users: `npm install -g devflow-agent` → `devflow-agent init` → `devflow-agent start`

## Phase 5 Workplan

### 5A: Agent CLI Setup

- [ ] Create `apps/agent` directory (separate from `apps/agent-host`)
- [ ] Create CLI entry point with `bin/devflow-agent`
- [ ] Implement `devflow-agent init` command
  - [ ] OAuth flow (open browser to platform)
  - [ ] Generate and save DEVFLOW_AUTH_TOKEN
  - [ ] Save config to ~/.devflow/config.json
  - [ ] Verify platform connectivity
- [ ] Implement `devflow-agent start` command
  - [ ] Load token from ~/.devflow/config.json
  - [ ] Register agent with platform
  - [ ] Start polling loop for commands
  - [ ] Handle graceful shutdown
- [ ] Configuration management
  - [ ] ~/.devflow/ directory creation
  - [ ] Encrypted token storage
  - [ ] Config validation
  - [ ] Platform URL configuration

### 5B: Platform API Updates

- [ ] POST /api/agents/register
  - Body: { agent_id, version, platform, capabilities }
  - Response: { registered_at, next_poll_in }
- [ ] GET /api/agents/{agent_id}/commands
  - Response: { commands: [{ task_id, intent, repo, ... }] }
  - Pagination support
- [ ] POST /api/agents/{agent_id}/heartbeat
  - Keep-alive and health check
- [ ] POST /api/tasks/{task_id}/progress
  - Status, step, progress, details
- [ ] POST /api/tasks/{task_id}/complete
  - success, pr_url, error_message

- [ ] Database schema updates
  - agents table (id, user_id, name, version, last_seen)
  - agent_tokens table (agent_id, token_hash, created_at, expires_at)
  - task_assignments table (task_id, agent_id, assigned_at)

### 5C: Authentication & Security

- [ ] JWT token generation in platform
- [ ] Token validation in platform API
- [ ] Token encryption at rest
- [ ] Token rotation mechanism
- [ ] Per-agent permission scopes
- [ ] Rate limiting per agent
- [ ] Audit logging for agent actions

### 5D: Agent Distribution

- [ ] Create npm package.json in `apps/agent`
- [ ] Add shebang to bin/devflow-agent
- [ ] Package scripts for publish
- [ ] .npmignore for clean distribution
- [ ] Publish to npm as `devflow-agent`

- [ ] Documentation
  - [ ] Installation instructions
  - [ ] Getting started guide
  - [ ] Configuration reference
  - [ ] Troubleshooting guide
  - [ ] Security best practices

### 5E: Local Development

- [ ] Docker Compose for local full stack
  - [ ] Postgres for database
  - [ ] Pinga platform (port 3000)
  - [ ] Redis for job queue
  - [ ] Example agent (port 3001)

- [ ] E2E test scripts
  - [ ] User signup flow
  - [ ] Agent registration
  - [ ] Command execution
  - [ ] Progress updates
  - [ ] PR creation

### 5F: Error Handling & Monitoring

- [ ] Retry logic with exponential backoff
- [ ] Structured logging (JSON format)
- [ ] Error reporting to platform
- [ ] Agent health monitoring
- [ ] Graceful degradation
- [ ] Local fallback for platform connectivity

### 5G: Documentation & Deployment

- [ ] README.md for agents
- [ ] Architecture diagram
- [ ] User getting started guide
- [ ] Developer setup guide
- [ ] Platform deployment guide
- [ ] Monitoring and alerting setup

## Implementation Details

### CLI Structure

```
apps/agent/
├── bin/
│   └── devflow-agent          # Executable entry point
├── src/
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── init.ts        # devflow-agent init
│   │   │   ├── start.ts       # devflow-agent start
│   │   │   ├── status.ts      # devflow-agent status
│   │   │   └── config.ts      # devflow-agent config
│   │   └── index.ts           # CLI router
│   ├── agent/
│   │   ├── client.ts          # Platform API client
│   │   ├── poller.ts          # Command polling loop
│   │   ├── executor.ts        # Task execution
│   │   └── reporter.ts        # Progress reporting
│   ├── auth/
│   │   ├── oauth.ts           # Browser OAuth flow
│   │   ├── tokens.ts          # Token management
│   │   └── crypto.ts          # Encryption
│   ├── config.ts              # ~/.devflow/config.json
│   └── index.ts               # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

### Configuration

```json
~/.devflow/config.json
{
  "version": "1.0",
  "platform": {
    "url": "https://devflow-web.vercel.app",
    "api_key": "devflow_sk_live_xxxxx"
  },
  "agent": {
    "id": "agent_abc123",
    "name": "My DevFlow Agent",
    "version": "0.1.0"
  },
  "logging": {
    "level": "info",
    "format": "json"
  },
  "execution": {
    "max_concurrent_tasks": 1,
    "timeout_seconds": 3600,
    "cache_dir": "/tmp/devflow"
  }
}
```

### Platform Authentication

```typescript
// User logs in at platform
// Platform generates JWT token
POST /api/agents/generate-token
Response: {
  token: "devflow_sk_live_jwt_token",
  expires_in: 2592000,  // 30 days
  refresh_token: "..."
}

// Agent stores token in ~/.devflow/config.json
// Agent sends in every request
Authorization: Bearer devflow_sk_live_jwt_token
```

### Command Polling

```typescript
// Agent polls every 5 seconds
GET /api/agents/{agent_id}/commands
Response: {
  commands: [
    {
      task_id: "task_abc123",
      intent: "fix-bug",
      repo: "owner/repo",
      branch: "main",
      description: "Fix authentication timeout",
      created_at: "2026-01-23T22:00:00Z"
    }
  ]
}

// Agent executes locally
// Agent reports progress
POST /api/tasks/{task_id}/progress
{
  status: "in_progress",
  step: "Running tests...",
  progress: 0.75
}

// Task completes
POST /api/tasks/{task_id}/complete
{
  success: true,
  pr_url: "https://github.com/owner/repo/pull/123"
}
```

## User Experience Flow

### First Time Setup

```
$ npm install -g devflow-agent
+ devflow-agent@0.1.0

$ devflow-agent init

✓ Welcome to DevFlow Agent!
✓ Opening browser to https://devflow-web.vercel.app/auth/agent

[Browser opens, user logs in]

✓ Authorization successful!
✓ Saved configuration to ~/.devflow/config.json
✓ Agent ID: agent_abc123
✓ Agent is ready to use!

$ devflow-agent start

✓ DevFlow Agent v0.1.0 starting...
✓ Platform: https://devflow-web.vercel.app
✓ Agent ID: agent_abc123
✓ Polling for commands every 5s...
✓ Press Ctrl+C to stop

[Agent runs, waits for commands]
```

### Using DevFlow

```
[In Slack]
@devflow fix owner/repo Fix the authentication bug

[Telegram logs]
Platform:  🔄 Received command: fix
Platform:  ➡️  Routing to agent_abc123
Agent:     📦 Received task_task123
Agent:     📥 Cloning owner/repo...
Agent:     📖 Analyzing code...
Agent:     ✏️  Applying fix...
Agent:     ✅ Running tests...
Agent:     🚀 Creating PR...
Platform:  ✅ Complete! PR: https://github.com/owner/repo/pull/456
Slack:     ✅ DevFlow completed! PR created: [link]
```

## Success Criteria

By end of Phase 5:

- ✅ Users can `npm install -g devflow-agent`
- ✅ Users can `devflow-agent init` with OAuth
- ✅ Users can `devflow-agent start` to begin polling
- ✅ Platform receives commands from multiple agents
- ✅ Commands routed correctly to user's agent
- ✅ Real-time progress updates in Slack/Telegram
- ✅ PRs created on GitHub from local agent
- ✅ Full end-to-end working system
- ✅ Zero user exposure to source code
- ✅ Comprehensive user documentation

## Timeline

- **Days 1-3**: CLI setup (init, start, config)
- **Days 4-5**: Platform API endpoints
- **Days 6-8**: Authentication & security
- **Days 9-10**: Error handling & monitoring
- **Days 11-12**: npm package & distribution
- **Days 13-15**: Testing & documentation
- **Days 16+**: Deployment & final polish

**Deadline: February 15, 2025 (25 days remaining)**

## Open Questions

1. How to handle agent updates? (auto-update, version checking)
2. How to manage GitHub credentials? (user provides PAT, or OAuth?)
3. How to support multiple agents per user?
4. How to monitor agent health?
5. How to handle agent failures and retries?
6. How to store execution history?

## What Stays the Same

- All tools from Phase 2 ✅
- All workflows from Phase 3 ✅
- All Pinga integration from Phase 4 ✅
- Copilot SDK integration ✅
- GitHub integration ✅

## What Changes

- Agent goes from localhost:3001 HTTP server to CLI tool
- Platform API changes (authentication, registration, polling)
- Configuration from .env.local to ~/.devflow/config.json
- Deployment from "run this app" to "npm install -g"

This is the final piece to make Devflow a real product! 🚀
