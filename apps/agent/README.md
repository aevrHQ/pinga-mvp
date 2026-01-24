# @untools/devflow

The self-hosted CLI agent for **DevFlow** - an AI-powered DevOps platform powered by GitHub Copilot.

Install this CLI tool on your local machine or server to execute AI-driven development tasks securely on your own infrastructure.

## What is DevFlow?

DevFlow is a production SaaS platform that orchestrates AI-powered development workflows. Create a DevFlow account, connect your GitHub repositories and communication channels (Slack, Telegram), then use the **@untools/devflow** CLI to execute complex development tasks right from your machine.

**Key Features:**
- 🤖 AI-powered development workflows (fix bugs, implement features, write documentation, review PRs)
- 🔒 Self-hosted - code never leaves your machine
- 📱 Multi-channel notifications (Slack, Telegram)
- 🔗 GitHub integration for repositories, issues, and pull requests
- ⚡ Real-time task execution with progress updates
- 🛠️ Built on GitHub Copilot SDK

## Installation

Install @untools/devflow globally via npm:

```bash
npm install -g @untools/devflow
```

Or locally in your project:

```bash
npm install @untools/devflow
```

## Quick Start

### 1. Authenticate

Initialize your local agent and connect to the DevFlow platform:

```bash
devflow init
```

This command will:
- Prompt you for your DevFlow account credentials
- Open a browser for OAuth authentication if needed
- Save a secure JWT token to `~/.devflow/config.json`
- Create your local agent registration

### 2. Start the Agent

Run the CLI agent to begin polling for tasks:

```bash
devflow start
```

The agent will:
- Connect to the DevFlow platform
- Poll for pending tasks every 5 seconds
- Execute workflows using GitHub Copilot
- Report progress and results back to the platform
- Send notifications to your Slack/Telegram channels

### 3. Execute Tasks

Tasks are created through the DevFlow web dashboard or API. Once you start the agent, it will automatically:
1. Receive task assignments
2. Execute workflows (fix-bug, feature, explain, review-pr)
3. Update task progress in real-time
4. Notify you when complete

## Configuration

The agent stores configuration in `~/.devflow/config.json`:

```json
{
  "version": "1.0",
  "platform": {
    "url": "https://devflow.dev",
    "api_key": "your-jwt-token"
  },
  "agent": {
    "id": "agent-12345",
    "name": "my-local-agent",
    "version": "0.1.0"
  },
  "logging": {
    "level": "info",
    "format": "text"
  },
  "execution": {
    "max_concurrent_tasks": 1,
    "timeout_seconds": 3600,
    "cache_dir": "~/.devflow/cache"
  }
}
```

**Security Note:** This file is created with `0o600` permissions (user-readable only). Never share your config file or API key.

## Environment Variables

Configure the agent with these environment variables:

```bash
# Platform connection
DEVFLOW_PLATFORM_URL=https://devflow.dev
DEVFLOW_AGENT_TOKEN=your-jwt-token
DEVFLOW_AGENT_ID=agent-12345

# Agent-Host communication (for task execution)
AGENT_HOST_URL=http://localhost:3001

# Copilot SDK
COPILOT_MODEL=gpt-4.1

# Logging
DEVFLOW_LOG_LEVEL=info
DEVFLOW_LOG_FORMAT=text

# Polling
DEVFLOW_POLL_INTERVAL=5000
```

## Commands

### `devflow init`

Initialize and authenticate with the DevFlow platform.

```bash
devflow init
# ? Platform URL: https://devflow.dev
# ? Authenticate with DevFlow? (Y/n) 
# ✓ Configuration saved to ~/.devflow/config.json
```

### `devflow start`

Start the agent and begin polling for tasks.

```bash
devflow start
# 🚀 DevFlow Agent started
# 📍 Platform: https://devflow.dev
# 🔄 Polling interval: 5000ms
# ⏳ Waiting for tasks...
```

The agent will display:
- Incoming task assignments
- Execution progress
- Completion status
- Any errors encountered

### `devflow status`

Check the current status and configuration of your agent.

```bash
devflow status
# 🏃 Agent Status
# ├─ Connected: true
# ├─ Agent ID: agent-12345
# ├─ Platform: https://devflow.dev
# ├─ Uptime: 2 hours 34 minutes
# └─ Tasks processed: 5
```

### `devflow help`

Display help for all available commands.

```bash
devflow help
```

## Supported Workflows

The agent can execute these AI-powered workflows:

| Workflow | Description | Input |
|----------|-------------|-------|
| `fix-bug` | Analyze issue, fix code, run tests, create PR | Issue description, repo URL |
| `feature` | Implement new feature with tests and documentation | Feature requirements, repo URL |
| `explain` | Generate documentation for code | Code snippet, documentation type |
| `review-pr` | Review pull request for best practices | PR URL, focus areas |

## Task Execution Flow

```
DevFlow Platform
       ↓
    Enqueues Task
       ↓
CLI Agent Polls /api/agents/[id]/commands
       ↓
   Receives Task
       ↓
Calls Agent-Host API (/api/workflows/execute)
       ↓
  Agent-Host invokes Copilot SDK
       ↓
  Copilot executes tools and workflows
       ↓
  Agent reports progress & completion
       ↓
Platform notifies user (Slack/Telegram)
```

## Security & Privacy

- **Local Execution:** Code analysis and modification happens on your machine only
- **Secure Config:** Configuration stored with `0o600` permissions (user-readable only)
- **Token Storage:** JWT tokens never leave your `~/.devflow/config.json` file
- **No Code Upload:** Your repository code is never sent to external services
- **GitHub Credentials:** Optional PAT stored locally, never shared with platform

## Troubleshooting

### Agent won't start

Check that you've initialized the agent first:

```bash
devflow status  # If this fails, run init first
```

### Tasks not received

Verify your platform connection:

```bash
devflow status
# Look for "Connected: true"
```

Check your JWT token hasn't expired (30-day expiry):

```bash
cat ~/.devflow/config.json | grep api_key
# Token should be valid
```

### Execution failures

Enable debug logging:

```bash
DEVFLOW_LOG_LEVEL=debug devflow start
```

Check agent-host is running (if using custom workflows):

```bash
curl http://localhost:3001/health
# Should return {"status": "healthy"}
```

### Authentication issues

Re-initialize your authentication:

```bash
rm ~/.devflow/config.json
devflow init
```

## Development

For developers contributing to devflow:

```bash
# Clone the repository
git clone https://github.com/devflow/devflow.git
cd devflow

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run CLI tests
npm run cli -- init
npm run cli -- start
```

## Architecture

The DevFlow system consists of three components:

1. **Pinga Web Platform** - SaaS dashboard for task creation, monitoring, and configuration
2. **Agent CLI** (this package) - Self-hosted CLI that polls for and executes tasks
3. **Agent-Host** - Local service that runs Copilot SDK workflows

Communication flow:
```
Web Platform → Agent CLI (polls) → Agent-Host (executes)
                                  ↓
                           Copilot SDK / Tools
```

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- 📖 [DevFlow Documentation](https://docs.devflow.dev)
- 💬 [GitHub Discussions](https://github.com/devflow/devflow/discussions)
- 🐛 [Report Issues](https://github.com/devflow/devflow/issues)
- 📧 [Email Support](support@devflow.dev)

## Changelog

### v0.1.0 (Beta)

- Initial release with core CLI commands (init, start, status)
- GitHub Copilot SDK integration
- Workflow execution (fix-bug, feature, explain, review-pr)
- Platform API integration
- Secure token-based authentication
- Configuration management
- Task polling and execution

---

**Made with ❤️ for developers by the DevFlow team**

Built on the GitHub Copilot SDK for the [GitHub Copilot CLI Challenge](https://github.blog/news-and-insights/copilot-cli-challenge/)
