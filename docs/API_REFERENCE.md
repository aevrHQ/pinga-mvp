# DevFlow API Documentation

Complete API specification for the DevFlow platform.

## Base URLs

- **Production:** `https://api.devflow.dev`
- **Development:** `http://localhost:3000`
- **Agent-Host:** `http://localhost:3001`

## Authentication

All API requests require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

JWT tokens are obtained via:
1. OAuth login (web platform)
2. PIN/Magic link login (development)
3. Agent registration endpoint

Tokens expire after **30 days**. Refresh by re-authenticating.

---

## Agents API

### Register Agent

Create and authenticate a self-hosted agent.

```
POST /api/agents
Authorization: Bearer <user-token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "agentId": "string (required)",
  "userId": "string (optional, set by platform)",
  "name": "string (required)",
  "version": "string (required)",
  "platform": "string (darwin/linux/win32)",
  "capabilities": ["fix-bug", "feature", "explain", "review-pr"]
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "agent": {
    "id": "agent-550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-123",
    "name": "my-local-agent",
    "status": "active",
    "version": "0.2.0",
    "platform": "darwin",
    "capabilities": ["fix-bug", "feature", "explain", "review-pr"],
    "lastHeartbeat": "2025-01-24T00:00:00Z",
    "createdAt": "2025-01-24T00:00:00Z",
    "updatedAt": "2025-01-24T00:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

```json
// 400 Bad Request
{
  "error": "Missing required fields",
  "details": ["agentId", "name", "version"]
}

// 401 Unauthorized
{
  "error": "Invalid or expired token"
}

// 409 Conflict
{
  "error": "Agent with this ID already exists for user"
}
```

---

### List Agents

Get all agents registered by the current user.

```
GET /api/agents
Authorization: Bearer <user-token>
```

**Query Parameters:**

- `status` (optional): Filter by status (active, inactive, error)
- `capability` (optional): Filter by capability (fix-bug, feature, etc.)

**Response (200 OK):**

```json
{
  "agents": [
    {
      "id": "agent-550e8400...",
      "name": "my-local-agent",
      "status": "active",
      "version": "0.2.0",
      "platform": "darwin",
      "capabilities": ["fix-bug", "feature"],
      "lastHeartbeat": "2025-01-24T00:15:00Z",
      "createdAt": "2025-01-24T00:00:00Z"
    }
  ],
  "total": 1
}
```

---

### Get Pending Commands

Poll for tasks assigned to this agent.

```
GET /api/agents/:agent_id/commands
Authorization: Bearer <agent-token>
```

**Path Parameters:**

- `agent_id` (required): UUID of the agent

**Query Parameters:**

- `limit` (optional, default: 10): Maximum tasks to return

**Response (200 OK):**

```json
{
  "commands": [
    {
      "task_id": "task-550e8400-e29b-41d4-a716-446655440000",
      "intent": "fix-bug",
      "repo": "https://github.com/user/repo",
      "branch": "main",
      "description": "Fix null pointer exception in login flow",
      "context": {
        "issueId": "123",
        "prId": "456"
      },
      "created_at": "2025-01-24T00:00:00Z"
    }
  ]
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "error": "Agent token expired or invalid"
}

// 404 Not Found
{
  "error": "Agent not found"
}
```

---

### Heartbeat (Keep-Alive)

Signal that the agent is alive and ready to receive tasks.

```
POST /api/agents/:agent_id/heartbeat
Authorization: Bearer <agent-token>
Content-Type: application/json
```

**Path Parameters:**

- `agent_id` (required): UUID of the agent

**Request Body:**

```json
{
  "status": "ready",
  "uptime": 3600,
  "taskCount": 5,
  "memoryUsage": 256,
  "cpuUsage": 12.5
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "nextPollInterval": 5000
}
```

---

## Tasks API

### Get Task

Get details about a specific task.

```
GET /api/tasks/:task_id
Authorization: Bearer <user-token>
```

**Response (200 OK):**

```json
{
  "id": "task-550e8400...",
  "userId": "user-123",
  "agentId": "agent-550e8400...",
  "intent": "fix-bug",
  "repo": "https://github.com/user/repo",
  "branch": "main",
  "description": "Fix null pointer exception",
  "status": "in_progress",
  "progress": 0.45,
  "currentStep": "Running tests",
  "createdAt": "2025-01-24T00:00:00Z",
  "startedAt": "2025-01-24T00:01:00Z",
  "completedAt": null,
  "error": null
}
```

---

### Report Task Progress

Update progress while executing a task.

```
POST /api/tasks/:task_id/progress
Authorization: Bearer <agent-token>
Content-Type: application/json
```

**Path Parameters:**

- `task_id` (required): UUID of the task

**Request Body:**

```json
{
  "status": "in_progress",
  "step": "Running test suite",
  "progress": 0.65,
  "details": "Executed 45/65 tests"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "taskId": "task-550e8400...",
  "message": "Progress updated"
}
```

**Error Responses:**

```json
// 400 Bad Request
{
  "error": "Progress must be between 0 and 1"
}

// 404 Not Found
{
  "error": "Task not found"
}
```

---

### Complete Task

Mark a task as completed successfully.

```
POST /api/tasks/:task_id/complete
Authorization: Bearer <agent-token>
Content-Type: application/json
```

**Path Parameters:**

- `task_id` (required): UUID of the task

**Request Body:**

```json
{
  "success": true,
  "summary": "Fixed null pointer exception in auth service",
  "output": "Created PR #456 with fix and tests",
  "prUrl": "https://github.com/user/repo/pull/456",
  "resultFiles": {
    "commit": "abc123def456",
    "files": ["src/auth/login.ts", "tests/auth.test.ts"]
  }
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "taskId": "task-550e8400...",
  "status": "completed"
}
```

---

### Fail Task

Mark a task as failed with error details.

```
POST /api/tasks/:task_id/fail
Authorization: Bearer <agent-token>
Content-Type: application/json
```

**Path Parameters:**

- `task_id` (required): UUID of the task

**Request Body:**

```json
{
  "error": "Repository clone failed",
  "details": "Failed to authenticate with GitHub: invalid credentials",
  "logs": "...execution logs..."
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "taskId": "task-550e8400...",
  "status": "failed"
}
```

---

## Workflows API (Agent-Host)

### Execute Workflow

Synchronously execute a workflow. This is called by the CLI agent.

```
POST /api/workflows/execute
Content-Type: application/json
```

**Request Body:**

```json
{
  "taskId": "task-550e8400...",
  "intent": "fix-bug",
  "repo": "https://github.com/user/repo",
  "branch": "main",
  "naturalLanguage": "Fix the null pointer exception in login flow"
}
```

**Response (202 Accepted):**

```json
{
  "accepted": true,
  "taskId": "task-550e8400..."
}
```

The workflow executes asynchronously. Progress and completion are reported via the platform API.

**Error Responses:**

```json
// 400 Bad Request
{
  "error": "Missing required fields",
  "details": ["taskId", "intent", "repo", "naturalLanguage"]
}

// 500 Internal Server Error
{
  "error": "Failed to execute workflow",
  "message": "Copilot SDK connection failed"
}
```

---

## Authentication Endpoints

### PIN Login

For development/testing without OAuth.

```
POST /api/auth/pin/login
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "pin": "123456"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

### OAuth Callback

```
GET /api/auth/slack/callback?code=<oauth_code>&state=<state>
```

Redirects to dashboard on success.

---

## Webhook Events

### Task Created

```
POST /webhook
Content-Type: application/json

{
  "event": "task.created",
  "data": {
    "taskId": "task-550e8400...",
    "userId": "user-123",
    "intent": "fix-bug",
    "repo": "https://github.com/user/repo"
  }
}
```

### Task Completed

```
POST /webhook
Content-Type: application/json

{
  "event": "task.completed",
  "data": {
    "taskId": "task-550e8400...",
    "status": "completed",
    "prUrl": "https://github.com/user/repo/pull/123",
    "completedAt": "2025-01-24T00:30:00Z"
  }
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Error title",
  "message": "Detailed error description",
  "statusCode": 400,
  "timestamp": "2025-01-24T00:00:00Z"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 202 | Accepted - Request accepted for processing |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/expired token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Error - Server error |

---

## Rate Limiting

- **Agents API:** 100 requests/minute per user
- **Tasks API:** 1000 requests/minute per agent  
- **Heartbeat:** 10 requests/minute per agent (1 every 5-60 seconds)

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705636800
```

---

## SDK Usage

### JavaScript/TypeScript

```javascript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Register agent
const response = await client.post('/api/agents', {
  agentId: 'agent-uuid',
  name: 'my-agent',
  version: '0.2.0',
  capabilities: ['fix-bug']
});

// Get pending commands
const commands = await client.get('/api/agents/agent-id/commands');

// Report progress
await client.post('/api/tasks/task-id/progress', {
  status: 'in_progress',
  progress: 0.5,
  step: 'Running tests'
});

// Complete task
await client.post('/api/tasks/task-id/complete', {
  success: true,
  summary: 'Task completed',
  prUrl: 'https://github.com/...'
});
```

---

## Pagination

List endpoints support cursor-based pagination:

```
GET /api/agents?limit=10&offset=0
```

Response includes:

```json
{
  "data": [...],
  "total": 100,
  "limit": 10,
  "offset": 0,
  "hasMore": true
}
```

---

**Last Updated:** 2025-01-24  
**API Version:** 1.0  
**Status:** Production Ready
