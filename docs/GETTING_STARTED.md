# Getting Started with DevFlow

Complete guide to set up and run DevFlow for the first time.

## 5-Minute Quick Start

### Step 1: Install devflow

```bash
npm install -g devflow
```

Verify installation:
```bash
devflow --version
# Output: devflow 0.2.0
```

### Step 2: Initialize Agent

```bash
devflow init
```

Follow the prompts:
```
? Platform URL: (https://devflow.dev) http://localhost:3000
? Authenticate with DevFlow? (Y/n) Y
```

This will:
- Open your browser for authentication
- Save credentials to `~/.devflow/config.json`
- Register your agent with the platform

### Step 3: Start the Agent

```bash
devflow start
```

You should see:
```
🚀 DevFlow Agent started
📍 Platform: http://localhost:3000
🔄 Polling interval: 5000ms
✓ Connected successfully
⏳ Waiting for tasks...
```

### Step 4: Create Your First Task

Open the DevFlow web dashboard:
```
http://localhost:3000
```

1. Go to **Agents** → Your agent
2. Click **Create Task**
3. Select intent: **explain**
4. Paste a code snippet to analyze
5. Click **Execute**

Watch the agent terminal for execution progress!

---

## Installation Options

### Global Installation (Recommended)

```bash
npm install -g devflow

# Now available system-wide
devflow help
```

### Local Installation

```bash
cd my-project
npm install devflow

# Run via npx
npx devflow help
```

### From Source

```bash
git clone https://github.com/devflow/devflow.git
cd devflow
npm install
npm run build
npm link
```

---

## System Requirements

- **Node.js:** 18.0.0 or later
- **npm:** 9.0.0 or later
- **OS:** macOS, Linux, or Windows
- **Disk Space:** ~500MB (for node_modules)
- **Memory:** 256MB minimum
- **Network:** Internet connection required

### Check Requirements

```bash
node --version   # Should be >= 18.0.0
npm --version    # Should be >= 9.0.0
```

---

## Configuration

### Manual Configuration

If `init` doesn't work or you need custom settings:

```bash
mkdir -p ~/.devflow
nano ~/.devflow/config.json
```

Paste this template:

```json
{
  "version": "1.0",
  "platform": {
    "url": "https://devflow.dev",
    "api_key": "your-jwt-token-here"
  },
  "agent": {
    "id": "agent-550e8400-e29b-41d4-a716-446655440000",
    "name": "my-local-agent",
    "version": "0.2.0"
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

Save with correct permissions:
```bash
chmod 600 ~/.devflow/config.json
```

### Environment Variables

Override config with environment variables:

```bash
export DEVFLOW_PLATFORM_URL="https://devflow.dev"
export DEVFLOW_AGENT_TOKEN="your-jwt-token"
export DEVFLOW_AGENT_ID="agent-uuid"
export DEVFLOW_LOG_LEVEL="debug"

devflow start
```

---

## Common Workflows

### Fix a Bug

1. **Create issue on GitHub**
   - Description: "Login button not working on mobile"
   - Label: `bug`

2. **Create task in DevFlow**
   - Intent: `fix-bug`
   - Repo: `github.com/myuser/myproject`
   - Description: "Fix login button not working on mobile"

3. **Agent executes**
   - Clones repository
   - Analyzes issue
   - Implements fix
   - Runs tests
   - Creates pull request

4. **Review and merge PR**

### Implement a Feature

1. **Create feature request**
   - Spec: "Add dark mode to settings page"

2. **Create task**
   - Intent: `feature`
   - Repo: `github.com/myuser/myproject`
   - Description: "Implement dark mode with theme toggle"

3. **Agent executes**
   - Plans implementation
   - Writes code
   - Adds tests
   - Creates documentation
   - Opens PR

### Explain Code

1. **Select code in dashboard**
   - Or paste code snippet

2. **Create explain task**
   - Intent: `explain`
   - Description: "Explain how the authentication flow works"

3. **Agent generates**
   - Code analysis
   - Flow diagram (text)
   - Implementation notes

### Review Pull Request

1. **Copy PR link**

2. **Create review task**
   - Intent: `review-pr`
   - Repo: `github.com/myuser/myproject`
   - Description: "Review PR for best practices, security, and performance"

3. **Agent reviews**
   - Analyzes changes
   - Checks for issues
   - Posts review comments

---

## Development Setup

### Run Locally

Clone the complete DevFlow repository:

```bash
git clone https://github.com/devflow/devflow-platform.git
cd devflow-platform

# Install dependencies
npm install

# Start in development mode
npm run dev
```

This starts three services:

```
Terminal 1: Web Platform
npm run dev --workspace=apps/web
# http://localhost:3000

Terminal 2: Agent-Host
npm run dev --workspace=apps/agent-host
# http://localhost:3001

Terminal 3: CLI Agent
npm run dev --workspace=apps/agent -- cli start
```

### Create Test User

```bash
curl -X POST http://localhost:3000/api/auth/pin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "pin": "123456"
  }'
```

Save the returned token for authentication.

---

## Troubleshooting

### Agent won't start

**Problem:** `Error: Configuration not found`

**Solution:**
```bash
devflow init
# Re-initialize with fresh credentials
```

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:3000`

**Solution:**
Verify platform is running:
```bash
curl http://localhost:3000/health
# Should return healthy status
```

### Tasks not completing

**Problem:** Agent shows `⏳ Waiting for tasks...` but nothing happens

**Solution:** 
1. Check agent is registered:
   ```bash
   devflow status
   ```

2. Verify task was created:
   ```bash
   curl http://localhost:3000/api/tasks
   ```

3. Check agent-host is running:
   ```bash
   curl http://localhost:3001/health
   ```

### Authentication errors

**Problem:** `Error: Invalid token (401)`

**Solution:**
Token expired (valid for 30 days). Re-authenticate:
```bash
devflow init
```

**Problem:** `Error: Agent not found`

**Solution:**
Agent ID mismatch. Check:
```bash
cat ~/.devflow/config.json | grep agent.id
```

Must match the agent ID registered with platform.

### Network issues

**Problem:** `Error: getaddrinfo ENOTFOUND devflow.dev`

**Solution:**
No internet connection or DNS issue. Check:
```bash
ping devflow.dev
curl https://devflow.dev/health
```

### Performance issues

**Problem:** Agent using high CPU/memory

**Solution:**
1. Reduce polling frequency:
   ```bash
   export DEVFLOW_POLL_INTERVAL=10000
   devflow start
   ```

2. Limit concurrent tasks:
   Edit `~/.devflow/config.json`:
   ```json
   "execution": {
     "max_concurrent_tasks": 1
   }
   ```

3. Clear cache:
   ```bash
   rm -rf ~/.devflow/cache
   ```

---

## Best Practices

### Security

✅ **Do:**
- Keep JWT token in `~/.devflow/config.json`
- Use file mode `0o600` (user-readable only)
- Re-authenticate every 30 days
- Use environment variables for sensitive data

❌ **Don't:**
- Share your config file
- Commit config to version control
- Use shared/public machines for agent
- Store tokens in `.env` files in repos

### Execution

✅ **Do:**
- Use clear, descriptive task descriptions
- Test agents on non-critical projects first
- Review generated PRs before merging
- Monitor agent logs during execution

❌ **Don't:**
- Run multiple agents with same ID
- Change config while agent is running
- Kill agent abruptly (let it finish)
- Queue 100s of tasks at once

### Development

✅ **Do:**
- Use semantic versioning
- Write tests for workflows
- Document custom tools
- Monitor agent performance

❌ **Don't:**
- Skip testing before release
- Modify core platform code
- Commit credentials
- Ignore error logs

---

## Getting Help

### Documentation

- [API Reference](./API_REFERENCE.md)
- [E2E Testing Guide](./E2E_TESTING.md)
- [Architecture Guide](../ARCHITECTURE.md)

### Community

- [GitHub Discussions](https://github.com/devflow/devflow/discussions)
- [Issue Tracker](https://github.com/devflow/devflow/issues)
- [Slack Community](https://devflow-community.slack.com)

### Support Channels

- Email: support@devflow.dev
- Twitter: [@devflow_ai](https://twitter.com/devflow_ai)
- Discord: [DevFlow Server](https://discord.gg/devflow)

---

## Next Steps

1. ✅ Install and run agent
2. ✅ Create your first task
3. ✅ Review generated PR
4. → Explore other workflow types
5. → Connect Slack/Telegram for notifications
6. → Set up GitHub repository integration
7. → Deploy agent to remote server

---

**Happy coding with DevFlow!** 🚀

For the latest updates, visit [devflow.dev](https://devflow.dev)
