# Devflow Architecture - End-User Ready

## Current Problem

The current architecture requires:

- Users download the full GitHub repo
- Users set up Node.js, npm, environment variables
- Users run both Pinga and Agent Host locally
- Users modify source code

**This doesn't work for end users.** They need a proper SaaS platform.

## Correct Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  DEVFLOW PLATFORM                       │
│              (devflow.yourcompany.com)                  │
│                                                         │
│  ├─ Web Dashboard (signup, connect services)           │
│  ├─ OAuth Integration (GitHub, Slack, Telegram)        │
│  ├─ API Server (command routing, progress relay)       │
│  └─ Admin Portal (usage, logs, management)             │
│                                                         │
│  🔗 Connects to User's Slack/Telegram                 │
│  🔗 Receives DevFlow Agent connections                │
│  🔗 Routes commands and updates                        │
└─────────────────────────────────────────────────────────┘
                          ↑↓
        ┌──────────────────────────────────────┐
        │   DEVFLOW AGENT (User Installed)     │
        │   (CLI tool / Docker / service)      │
        │                                      │
        │  Runs on:                           │
        │  - User's laptop                    │
        │  - Dev server                       │
        │  - AWS/GCP/Azure                    │
        │  - Docker container                 │
        │                                      │
        │  Does:                              │
        │  ├─ Polls for commands              │
        │  ├─ Executes workflows with Copilot│
        │  ├─ Reports progress & results      │
        │  └─ Manages local git repos         │
        └──────────────────────────────────────┘
                          ↑↓
┌─────────────────────────────────────────────────────────┐
│                   USER ENVIRONMENT                      │
│                                                         │
│  ├─ GitHub (where code lives)                         │
│  ├─ Local Git Repositories                            │
│  ├─ Local Copilot Installation                        │
│  └─ Slack/Telegram Channels                           │
└─────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Devflow Platform (Web App)

**Current Location:** `apps/web` (Pinga)

**Should:**

- ✅ Web dashboard for user accounts
- ✅ OAuth connections to GitHub/Slack/Telegram
- ✅ API endpoints for agent communication
- ✅ Task management and history
- ✅ Real-time progress updates
- ✅ Settings and preferences
- ✅ Agent registration/pairing

**No Changes Needed** - this stays mostly the same, just branded as "Devflow Platform"

### 2. Devflow Agent (Self-Hosted)

**Current Location:** `apps/agent-host` (agent runtime)

**Should be delivered as:**

#### Option A: npm CLI Package

```bash
npm install -g devflow-agent
devflow-agent init  # Authenticate with platform
devflow-agent start # Keep running and polling
```

#### Option B: Docker Container

```bash
docker run -e DEVFLOW_AUTH_TOKEN=xxx \
           -v ~/.ssh:/root/.ssh \
           -v ~/.git-credentials:/root/.git-credentials \
           ghcr.io/your-org/devflow-agent:latest
```

#### Option C: Binary Executable

```bash
./devflow-agent-macos-x64 init
./devflow-agent-macos-x64 start
```

#### Option D: Node.js Service

```bash
npm install devflow-agent
npx devflow-agent init
npx devflow-agent start
```

## User Journey

### Step 1: Sign Up

```
User visits devflow.yourcompany.com
→ Creates account (email or OAuth)
→ Verifies email
```

### Step 2: Connect Services

```
Dashboard → Settings → Connected Services
├─ GitHub (OAuth) - for repo access
├─ Slack (OAuth) - for notifications
└─ Telegram (OAuth) - for notifications
```

### Step 3: Install Agent

```
User on their machine:
  1. npm install -g devflow-agent
  2. devflow-agent init
     → Opens browser to devflow.yourcompany.com
     → User logs in with their account
     → Generates DEVFLOW_AUTH_TOKEN
     → Saves token locally (~/.devflow/config.json)
  3. devflow-agent start
     → Polls platform for commands
     → Executes on user's machine
     → Reports back to platform
```

### Step 4: Use Devflow

```
In Slack/Telegram:
  @devflow fix owner/repo Fix the bug
     ↓ (user's message)
  → Platform receives command
  → Routes to registered agent
  → Agent runs workflow
  → Updates sent back to Slack/Telegram
```

## API Communication Flow

```
Agent ←→ Platform

1. Agent starts:
   POST /api/agents/register
   { token, agent_id, capabilities, platform_info }

2. Agent polls for commands:
   GET /api/agents/{agent_id}/commands
   ← [{ task_id, intent, repo, ... }]

3. Agent executes and updates:
   POST /api/tasks/{task_id}/progress
   { status, step, progress, details }

4. Platform relays to user:
   → Slack/Telegram API
   ← User sees: "⏳ Running tests... [████████░░] 75%"

5. Agent completes:
   POST /api/tasks/{task_id}/complete
   { success, pr_url, error_message }
```

## Required Changes

### 1. Agent Authentication

Current: No authentication  
Needed:

- DEVFLOW_AUTH_TOKEN from platform
- JWT-based communication
- Agent registration/pairing

### 2. Agent Configuration

Current: .env.local hardcoded  
Needed:

- Interactive `devflow-agent init`
- Browser-based OAuth flow
- ~/.devflow/config.json for storage
- Platform URL configurable

### 3. Agent Distribution

Current: Source code in GitHub  
Needed:

- npm package: `devflow-agent`
- Docker image: `ghcr.io/devflow/agent`
- Binary executables for macOS/Linux/Windows
- Automatic updates (npm or container registry)

### 4. Platform Changes

Current: Expects agent at localhost:3001  
Needed:

- Agent registration endpoint
- Command queue (Redis or database)
- Multiple agents per user
- Agent health checks
- Agent versioning

## Implementation Roadmap

### Phase 5A: Agent CLI Setup

- [ ] Create `devflow-agent init` command
- [ ] Browser OAuth flow for authentication
- [ ] Secure token storage in ~/.devflow/config.json
- [ ] Agent registration with platform

### Phase 5B: Agent Distribution

- [ ] Package as npm global: `npm install -g devflow-agent`
- [ ] Create Dockerfile
- [ ] Cross-platform builds (macOS, Linux, Windows)
- [ ] Publish to npm registry

### Phase 5C: Platform Integration

- [ ] Agent registration endpoint
- [ ] Command queue infrastructure
- [ ] Agent health monitoring
- [ ] Multiple agent management

### Phase 5D: Production Deployment

- [ ] Deploy platform to production server
- [ ] Set up agent distribution pipeline
- [ ] Documentation for users
- [ ] Support and monitoring

## Example: User's First Hour

```
1. User hears about Devflow
   → Visits devflow-web.vercel.app

2. Signs up with GitHub
   → OAuth flow
   → Account created

3. Connects Slack
   → Slack OAuth
   → Permission grant
   → Bot installed

4. Installs agent locally
   $ npm install -g devflow-agent
   $ devflow-agent init
   ✓ Opens browser to devflow-web.vercel.app
   ✓ User logs in
   ✓ Token generated
   ✓ Saved to ~/.devflow/config.json

5. Starts agent
   $ devflow-agent start
   ✓ Registers with platform
   ✓ Polling for commands...

6. Uses Devflow in Slack
   "!devflow fix owner/repo Fix auth bug"
   → Platform receives
   → Routes to user's agent
   → Agent clones, analyzes, fixes, tests
   → Creates PR
   → Updates in Slack

Done! No source code, no npm install in project directory, no .env files.
```

## Configuration Model

Instead of `.env.local` in project directory:

```
~/.devflow/config.json
{
  "version": "1",
  "platform_url": "https://devflow-web.vercel.app",
  "agent_id": "agent_abc123def456",
  "auth_token": "devflow_sk_live_abc123...",
  "log_level": "info",
  "cache_dir": "/tmp/devflow-repos",
  "max_cache_size": "10GB"
}
```

## Security Model

### Agent ↔ Platform

- JWT token authentication
- HTTPS only
- Token rotation capability
- Revoke per-agent

### Agent ↔ GitHub

- User provides GitHub PAT (or OAuth)
- Token stored locally, encrypted
- User controls which repos agent can access

### Agent ↔ Slack/Telegram

- Tokens stored on platform
- Agent never sees user's chat tokens
- Platform mediates all messages

## Scaling Considerations

### Single Agent

- User on laptop
- Small projects
- Dev use cases

### Multiple Agents

- Different machines
- Different GitHub orgs
- High availability

### Team Sharing

- Platform admins create "team" account
- Multiple users on same team
- Shared agents or individual agents

## What You Build vs. Distribute

### What Users Download

```
devflow-agent CLI package

npm install -g devflow-agent
└─ Simple, lightweight
└─ ~5MB total size
└─ All dependencies bundled
└─ Zero configuration needed
```

### What You Build Internally

```
Devflow Platform (web app)
├─ User authentication
├─ OAuth integrations
├─ API endpoints
├─ Command routing
├─ Storage/database
└─ Monitoring/logging

Devflow Agent (open source or internal)
├─ CLI tool
├─ Platform client
├─ Workflow executor
├─ Tool runner
└─ Local Copilot integration
```

## Summary

**Problem:** Current design is for developers, not end users

**Solution:**

1. Keep Pinga as "Devflow Platform" (web app)
2. Convert Agent Host to "devflow-agent" (CLI tool)
3. Users sign up → install agent → use DevFlow

**Key Changes:**

- Authentication via platform tokens
- Agent registration and discovery
- Command queue instead of direct HTTP
- Downloadable CLI or Docker image
- Zero source code exposure to users

This makes Devflow a real product end users can install and use!
