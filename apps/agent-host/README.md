# Devflow Agent Host

AI-powered DevOps agent that receives commands from Slack/Telegram (via Pinga) and performs development operations using the GitHub Copilot SDK.

## Features

- 🤖 AI-driven development workflows (fix bugs, implement features, explain code)
- 📝 Custom tool integration (git, tests, file I/O, GitHub PRs)
- 📊 Real-time progress updates streamed back to Slack/Telegram
- 🔗 Seamless integration with Pinga notification system
- 🛠️ GitHub Copilot SDK-powered intelligent code operations

## Quick Start

### Prerequisites

- Node.js 20+
- GitHub Personal Access Token
- Pinga API access (for progress notifications)

### Installation

```bash
npm install
```

### Environment Setup

```bash
cp .env.example .env.local
```

Fill in the required values:

- `GITHUB_TOKEN` - Your GitHub PAT with repo access
- `PINGA_API_URL` - URL to Pinga instance (e.g., https://pinga-mvp-web.vercel.app)
- `PINGA_API_SECRET` - Shared secret for API authentication
- `PORT` - Server port (default: 3001)

### Development

```bash
npm run dev
```

Server will start on `http://localhost:3001`

Check health: `http://localhost:3001/health`

## API Endpoints

### POST /command

Receive a command from Pinga to execute a development task.

**Request:**

```json
{
  "taskId": "task-123",
  "source": {
    "channel": "telegram",
    "chatId": "chat-456",
    "messageId": "msg-789"
  },
  "payload": {
    "intent": "fix-bug",
    "repo": "owner/repo-name",
    "branch": "main",
    "naturalLanguage": "Fix the authentication issue in the login flow"
  }
}
```

**Response:**

```json
{
  "accepted": true,
  "taskId": "task-123"
}
```

### GET /job/:taskId

Get the status of a queued job.

**Response:**

```json
{
  "taskId": "task-123",
  "status": "processing",
  "createdAt": 1674000000000,
  "startedAt": 1674000005000
}
```

### GET /health

Health check endpoint.

## Project Structure

```
src/
├── index.ts                 # Main Express server
├── types.ts                 # TypeScript type definitions
├── copilot/
│   ├── client.ts           # Copilot SDK client singleton
│   ├── tools/              # Custom tool implementations
│   │   ├── git.ts
│   │   ├── tests.ts
│   │   ├── github.ts
│   │   ├── files.ts
│   │   └── progress.ts
│   └── flows/              # Workflow implementations
│       ├── fix-bug.ts
│       ├── feature.ts
│       ├── explain.ts
│       └── review-pr.ts
├── queue/
│   └── processor.ts        # Job queue processor
└── pinga/
    └── client.ts           # Pinga API client
```

## Development Steps (Roadmap)

- [x] Phase 1: Core Infrastructure
  - [x] Set up Express server with TypeScript
  - [x] Implement `/command` and `/health` endpoints
  - [x] Create job queue processor
  - [x] Create Pinga client for progress updates
- [ ] Phase 2: Custom Tools
  - [ ] Git operations tool
  - [ ] Test runner tool
  - [ ] File I/O tools
  - [ ] GitHub PR tool
  - [ ] Progress update tool
- [ ] Phase 3: Workflows
  - [ ] Fix-bug workflow
  - [ ] Feature implementation workflow
  - [ ] Code explanation workflow
  - [ ] PR review workflow
- [ ] Phase 4: Integration
  - [ ] Pinga command detection
  - [ ] End-to-end testing
  - [ ] Production deployment

## Building & Testing

```bash
# Build
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## License

MIT
