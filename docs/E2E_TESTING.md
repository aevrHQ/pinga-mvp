# DevFlow End-to-End Test Guide

This document describes the complete end-to-end workflow testing for the DevFlow platform.

## Test Environment Setup

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Docker)
- GitHub account with a test repository
- DevFlow platform running locally on port 3000
- Agent-Host running locally on port 3001

### Start Services

```bash
# Terminal 1: Start the Pinga web platform
cd apps/web
npm run dev
# Platform runs on http://localhost:3000

# Terminal 2: Start the Agent-Host
cd apps/agent-host
npm run dev
# Agent-Host runs on http://localhost:3001

# Terminal 3: Start the CLI Agent
cd apps/agent
npm run cli -- start
```

## Test Scenarios

### Scenario 1: Agent Registration and Authentication

**Goal:** Verify agent can authenticate with platform

```bash
# Test agent init command
devflow init

# Expected flow:
# 1. CLI prompts for platform URL (default: http://localhost:3000)
# 2. CLI asks if user wants to authenticate
# 3. Opens browser for OAuth (or PIN login for development)
# 4. CLI receives JWT token from platform
# 5. Saves config to ~/.devflow/config.json with mode 0o600
# 6. Displays: "✓ Agent registered successfully"

# Verify config was created
cat ~/.devflow/config.json

# Expected fields:
# - version: "1.0"
# - platform.url: "http://localhost:3000"
# - platform.api_key: "<JWT token>"
# - agent.id: "<UUID>"
# - agent.name: "my-local-agent"
```

### Scenario 2: Agent Polling and Task Reception

**Goal:** Verify agent receives tasks from platform

```bash
# Start agent in one terminal
devflow start
# Expected: "⏳ Waiting for tasks..."

# In another terminal, create a task via API
curl -X POST http://localhost:3000/api/tasks/[task_id]/queue \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "fix-bug",
    "repo": "github.com/user/repo",
    "description": "Fix null pointer exception in login",
    "agent_id": "<agent_id>"
  }'

# In agent terminal, expected output:
# ⚡ Executing: fix-bug
# Task ID: <task_id>
# → Calling agent-host...
```

### Scenario 3: Task Execution and Completion

**Goal:** Verify task executes and completes successfully

1. Create a task via platform API
2. Agent receives task
3. Agent calls agent-host `/api/workflows/execute`
4. Agent-host invokes Copilot SDK
5. Workflow executes tools
6. Agent reports progress
7. Agent reports completion
8. Platform notifies user

**Expected Task Lifecycle:**

```
pending → in_progress → completed
   ↓            ↓
[0 sec]    [progress updates]
          [10% → 25% → 50% → 75% → 100%]
```

### Scenario 4: Error Handling

**Goal:** Verify agent handles errors gracefully

**Test Cases:**

1. **Invalid Config**
   ```bash
   rm ~/.devflow/config.json
   devflow start
   # Expected: "Error: Configuration not found. Run 'devflow init' first"
   ```

2. **Network Error**
   ```bash
   # Stop the platform service
   # Keep agent running
   # Expected: "⚠ Poll error: Connection refused"
   # Agent should retry with exponential backoff
   ```

3. **Expired Token**
   ```bash
   # Manually edit ~/.devflow/config.json and change api_key
   devflow start
   # Expected: "Error: Invalid token (401)"
   # Solution: Run 'devflow init' to re-authenticate
   ```

4. **Agent-Host Unavailable**
   ```bash
   # Stop agent-host service
   # Create a task for agent to execute
   # Expected: Agent reports "Error: Agent-host unreachable (http://localhost:3001)"
   ```

## API Contract Tests

### Agent Registration API

**Request:**
```
POST /api/agents
Authorization: Bearer <oauth-token>
Content-Type: application/json

{
  "agentId": "agent-uuid",
  "name": "my-local-agent",
  "version": "0.2.0",
  "platform": "darwin",
  "capabilities": ["fix-bug", "feature", "explain", "review-pr"]
}
```

**Response:**
```
HTTP 201 Created

{
  "success": true,
  "agent": {
    "id": "agent-uuid",
    "userId": "user-123",
    "name": "my-local-agent",
    "status": "active",
    "capabilities": ["fix-bug", "feature", "explain", "review-pr"],
    "createdAt": "2025-01-24T00:00:00Z"
  },
  "token": "eyJhbGc..."
}
```

### Get Pending Commands API

**Request:**
```
GET /api/agents/agent-uuid/commands
Authorization: Bearer <jwt-token>
```

**Response:**
```
HTTP 200 OK

{
  "commands": [
    {
      "task_id": "task-123",
      "intent": "fix-bug",
      "repo": "github.com/user/repo",
      "branch": "main",
      "description": "Fix login error",
      "created_at": "2025-01-24T00:00:00Z"
    }
  ]
}
```

### Report Progress API

**Request:**
```
POST /api/tasks/task-123/progress
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "status": "in_progress",
  "step": "Analyzing repository structure",
  "progress": 0.25,
  "details": "Scanning 245 files..."
}
```

**Response:**
```
HTTP 200 OK

{
  "success": true,
  "message": "Progress updated"
}
```

### Complete Task API

**Request:**
```
POST /api/tasks/task-123/complete
Authorization: Bearer <agent-token>
Content-Type: application/json

{
  "success": true,
  "summary": "Fixed null pointer exception in login flow",
  "prUrl": "https://github.com/user/repo/pull/123",
  "output": "Created PR with automated tests"
}
```

**Response:**
```
HTTP 200 OK

{
  "success": true,
  "taskId": "task-123",
  "status": "completed"
}
```

## Performance Tests

### Agent Polling Latency

Test that agent receives tasks within acceptable time:

```bash
# Measure time from task creation to agent receipt
START=$(date +%s%N)
curl -X POST http://localhost:3000/api/tasks/create ...
# Agent receives task (check logs)
END=$(date +%s%N)
LATENCY=$((($END - $START) / 1000000))
echo "Latency: ${LATENCY}ms"

# Expected: < 6 seconds (5s poll interval + 1s margin)
```

### Task Execution Time

Test execution time for different workflow types:

```bash
# fix-bug: expect 30-120 seconds
# feature: expect 60-300 seconds  
# explain: expect 5-30 seconds
# review-pr: expect 15-60 seconds
```

### Concurrent Tasks

Test agent with multiple task queues:

```bash
# Queue 5 tasks
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/tasks/create \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"intent\": \"explain\", \"repo\": \"...\"}"
done

# Expected:
# - Agent processes one at a time (max_concurrent_tasks: 1)
# - Each task queued in order
# - Total time ≈ sum of individual execution times
```

## Integration Tests

### GitHub Integration

```bash
# 1. Create test repository
# 2. Grant DevFlow OAuth permissions
# 3. Agent should be able to:
#    - Clone repository
#    - Create branches
#    - Commit changes
#    - Create pull requests
#    - Post PR comments
```

### Slack Integration

```bash
# 1. Connect Slack workspace to DevFlow
# 2. Create task via web dashboard
# 3. Expected: Slack notification received within 5 seconds
# 4. Task should contain: title, status, progress, action buttons
```

### Telegram Integration

```bash
# 1. Connect Telegram to DevFlow
# 2. Create task via web dashboard
# 3. Expected: Telegram message received within 5 seconds
# 4. Should show: task info, progress, status
```

## Load Test Scenarios

### Single Agent, Multiple Tasks

```bash
# Queue 20 tasks for single agent
for i in {1..20}; do
  curl -X POST http://localhost:3000/api/tasks/create \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"intent\": \"explain\", ...}"
done

# Monitor:
# - Agent memory usage (should stay < 500MB)
# - Agent CPU usage (should spike during execution, idle between)
# - Task queue depth
# - Completion rate
```

### Multiple Agents

```bash
# Start 3 agents
devflow init --agent-name agent-1
devflow init --agent-name agent-2
devflow init --agent-name agent-3

# Queue 30 tasks
# Expected: Load distributed across agents
# Each agent processes ~10 tasks
```

## Checklist for Release

- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] No TypeScript errors
- [ ] CLI help displays correctly
- [ ] Config file created with correct permissions
- [ ] Agent can authenticate with platform
- [ ] Agent can receive tasks
- [ ] Agent can execute workflows
- [ ] Progress updates sent correctly
- [ ] Task completion reported
- [ ] Error handling works
- [ ] Token expiration handling works
- [ ] Network retry logic works
- [ ] Documentation is accurate
- [ ] README examples work
- [ ] npm package installs correctly

## Debugging Tips

### Enable verbose logging

```bash
DEVFLOW_LOG_LEVEL=debug devflow start
```

### Check config validity

```bash
cat ~/.devflow/config.json | jq .
# Verify: version, platform.url, platform.api_key, agent.id
```

### Monitor API calls

```bash
# Terminal 1: Enable request logging
DEBUG=* devflow start

# Terminal 2: Watch HTTP traffic
tcpdump -i lo0 -A 'tcp port 3000 or tcp port 3001'
```

### Check platform logs

```bash
# Check Next.js logs
cd apps/web
npm run dev
# Look for: POST /api/agents, GET /api/agents/*/commands

# Check agent-host logs  
cd apps/agent-host
npm run dev
# Look for: POST /api/workflows/execute
```

---

**Last Updated:** 2025-01-24
**Test Coverage:** End-to-end, Integration, Load testing
