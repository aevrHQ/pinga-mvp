# DevFlow Troubleshooting Guide

Solutions for common issues and error messages.

## Installation Issues

### npm install fails

**Error:** `npm ERR! ERESOLVE unable to resolve dependency tree`

**Cause:** Node.js version incompatibility

**Solution:**
```bash
# Check your Node.js version
node --version

# Upgrade if < 18.0.0
nvm install 18
nvm use 18

# Try install again
npm install -g devflow-agent
```

### Command not found

**Error:** `devflow-agent: command not found`

**Cause:** npm global bin not in PATH

**Solution:**
```bash
# Find npm global bin directory
npm config get prefix
# Output: /usr/local/bin (or similar)

# Add to PATH if needed
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Try again
devflow-agent --version
```

### Permission denied

**Error:** `Error: EACCES: permission denied`

**Cause:** Permission issues with npm global directory

**Solution:**
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Reinstall
npm install -g devflow-agent
```

---

## Authentication Issues

### init command fails

**Error:** `Error: Failed to authenticate with DevFlow`

**Cause:** Platform unreachable or network issue

**Solution:**
```bash
# Check platform is running
curl http://localhost:3000/health
# Should return {"status": "healthy"}

# Check internet connection
ping google.com

# Try init again
devflow-agent init
```

### Browser doesn't open for OAuth

**Error:** Agent hangs after asking for OAuth

**Cause:** `open` package can't launch browser

**Solution:**
```bash
# Manual browser: Get URL from logs
# Copy the authentication URL shown in terminal
# Open in browser manually
# Paste token back into CLI

# Or use PIN login in development
curl -X POST http://localhost:3000/api/auth/pin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "pin": "123456"
  }'
```

### Token expired (401 error)

**Error:** `Error: Unauthorized (401) - Token expired`

**Cause:** JWT token valid for 30 days only

**Solution:**
```bash
# Re-authenticate
devflow-agent init

# Or update token manually
# Copy new token and update ~/.devflow/config.json
nano ~/.devflow/config.json
```

### Agent not found

**Error:** `Error: Agent not found (404)`

**Cause:** Agent ID mismatch between config and registration

**Solution:**
```bash
# Check your config
cat ~/.devflow/config.json

# Verify agent is registered on platform
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/agents

# If missing, re-register
devflow-agent init
```

---

## Configuration Issues

### Config file corrupted

**Error:** `Error: Invalid JSON in config file`

**Cause:** Manual editing mistake

**Solution:**
```bash
# Backup current config
cp ~/.devflow/config.json ~/.devflow/config.json.bak

# Delete and recreate
rm ~/.devflow/config.json
devflow-agent init
```

### Wrong platform URL

**Error:** `Error: Cannot connect to platform at ...`

**Cause:** Incorrect URL in config

**Solution:**
```bash
# Edit config
nano ~/.devflow/config.json

# Update platform.url to correct value
# Production: https://devflow.dev
# Local: http://localhost:3000

# Restart agent
devflow-agent start
```

### Missing credentials

**Error:** `Error: Missing platform.api_key`

**Cause:** Config incomplete

**Solution:**
```bash
# Remove and reinitialize
rm ~/.devflow/config.json
devflow-agent init
```

---

## Connection Issues

### Can't connect to platform

**Error:** `Error: ECONNREFUSED 127.0.0.1:3000`

**Cause:** Platform not running or wrong port

**Solution:**
```bash
# Check if platform is running
curl http://localhost:3000

# If not, start it
cd apps/web
npm run dev

# Or check production status
curl https://devflow.dev/health
```

### Can't reach agent-host

**Error:** `Error: Agent-host unreachable (http://localhost:3001)`

**Cause:** Agent-host service not running

**Solution:**
```bash
# Start agent-host
cd apps/agent-host
npm run dev

# Or check it's listening
curl http://localhost:3001/health

# Verify port in config
export AGENT_HOST_URL=http://localhost:3001
```

### Network timeout

**Error:** `Error: Request timeout (30s)`

**Cause:** Network too slow or service overloaded

**Solution:**
```bash
# Increase timeout via environment variable
export REQUEST_TIMEOUT=60000
devflow-agent start

# Or reduce polling frequency
export DEVFLOW_POLL_INTERVAL=10000
devflow-agent start
```

### DNS resolution failure

**Error:** `Error: getaddrinfo ENOTFOUND devflow.dev`

**Cause:** DNS server unreachable

**Solution:**
```bash
# Test DNS
nslookup devflow.dev
# or
dig devflow.dev

# Try alternate DNS server
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf

# Test connection
ping devflow.dev
```

---

## Task Execution Issues

### No tasks received

**Error:** Agent shows `⏳ Waiting for tasks...` indefinitely

**Cause:** 
- No tasks assigned
- Agent not registered
- Platform task creation failed

**Solution:**
```bash
# Check agent is registered and connected
devflow-agent status

# Verify agent is listed on platform
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/agents

# Create a test task
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "explain",
    "repo": "https://github.com/user/repo",
    "description": "Explain this code"
  }'
```

### Task execution hangs

**Error:** Agent receives task but never completes

**Cause:**
- Copilot SDK connection failed
- Agent-host crashed
- Too much resource usage

**Solution:**
```bash
# Check agent-host is running
curl http://localhost:3001/health

# Enable debug logging
DEVFLOW_LOG_LEVEL=debug devflow-agent start

# Check system resources
top -p $(pgrep -f "devflow-agent")
# If CPU/memory high, kill and restart

# Increase task timeout
nano ~/.devflow/config.json
# Change execution.timeout_seconds to 7200 (2 hours)
```

### Task fails immediately

**Error:** Task marked as failed before execution

**Cause:**
- Invalid task parameters
- Repository not found
- Permission issue

**Solution:**
```bash
# Check task details
curl http://localhost:3000/api/tasks/<task_id> \
  -H "Authorization: Bearer <token>"

# Verify repository exists
curl https://api.github.com/repos/user/repo

# Check GitHub credentials
git clone https://github.com/user/repo
# If auth fails, update credentials in config
```

---

## Tool/Workflow Issues

### Git operations fail

**Error:** `Error: git clone failed`

**Cause:**
- SSH key not configured
- GitHub credentials missing
- Network issue

**Solution:**
```bash
# Test git directly
git clone https://github.com/user/repo

# If auth fails, configure credentials
git config --global user.email "user@example.com"
git config --global user.name "User Name"

# Or use GitHub token
git config --global user.password "ghp_xxxx"

# Test SSH key
ssh -T git@github.com
```

### Tests fail during execution

**Error:** `Error: test suite failed`

**Cause:**
- Tests are failing
- Test runner not found
- Wrong Node version

**Solution:**
```bash
# Run tests locally first
cd my-repo
npm test

# Fix any failing tests

# Check Node version
node --version

# Verify test script in package.json
cat package.json | grep -A5 scripts
```

### File write permissions fail

**Error:** `Error: EACCES: permission denied`

**Cause:** 
- Read-only directory
- Files owned by different user
- Disk full

**Solution:**
```bash
# Check permissions
ls -la my-repo

# Fix ownership if needed
chown -R $USER my-repo

# Check disk space
df -h

# Free up space if needed
rm -rf ./node_modules
npm install
```

---

## Performance Issues

### High CPU usage

**Error:** Agent process using > 80% CPU

**Cause:**
- Long-running task
- Task stuck in loop
- Too many concurrent tasks

**Solution:**
```bash
# Check current task
devflow-agent status
# Look for in-progress tasks

# Kill if necessary
pkill -f "devflow-agent"
devflow-agent start

# Reduce concurrency
nano ~/.devflow/config.json
# Set max_concurrent_tasks: 1
```

### High memory usage

**Error:** Agent process using > 500MB RAM

**Cause:**
- Memory leak in workflow
- Large file processing
- Caching issue

**Solution:**
```bash
# Clear cache
rm -rf ~/.devflow/cache

# Reduce memory footprint
nano ~/.devflow/config.json
# Add "max_memory_mb": 256

# Restart agent
devflow-agent start
```

### Slow polling

**Error:** Tasks received slowly (> 10 seconds)

**Cause:**
- Network latency
- Platform overloaded
- Polling interval too long

**Solution:**
```bash
# Reduce polling interval
nano ~/.devflow/config.json
# Change polling_interval to 3000 (3 seconds)

# Or via environment variable
export DEVFLOW_POLL_INTERVAL=3000
devflow-agent start
```

---

## Logging & Debugging

### Enable debug logging

```bash
# Set log level
DEVFLOW_LOG_LEVEL=debug devflow-agent start

# Or change in config
nano ~/.devflow/config.json
# Set logging.level: "debug"
```

### View logs

```bash
# Agent logs are printed to terminal

# Or save to file
devflow-agent start > agent.log 2>&1

# View logs in real-time
tail -f agent.log

# Filter by keyword
grep "Error" agent.log
grep "task-id" agent.log
```

### Check platform logs

```bash
# Web platform logs (Next.js)
cd apps/web
npm run dev
# Logs in terminal

# Agent-host logs (Express)
cd apps/agent-host
npm run dev
# Logs in terminal
```

### Enable request tracing

```bash
# View all HTTP requests
DEBUG=axios devflow-agent start

# Or use curl with verbose flag
curl -v http://localhost:3000/api/agents
```

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ENOTFOUND` | DNS/network | Check internet, ping domain |
| `ECONNREFUSED` | Service not running | Start platform/agent-host |
| `401 Unauthorized` | Invalid token | Re-authenticate with init |
| `404 Not Found` | Resource doesn't exist | Verify ID, check registration |
| `EACCES` | Permission denied | Fix ownership with chown |
| `ENOMEM` | Out of memory | Clear cache, reduce tasks |
| `ETIMEDOUT` | Request too slow | Increase timeout, check network |

---

## Getting Help

If your issue isn't listed here:

1. **Check logs**
   ```bash
   DEVFLOW_LOG_LEVEL=debug devflow-agent start
   ```

2. **Collect diagnostics**
   ```bash
   devflow-agent status
   cat ~/.devflow/config.json
   node --version
   npm --version
   curl http://localhost:3000/health
   ```

3. **Report issue**
   - [GitHub Issues](https://github.com/devflow/devflow-agent/issues)
   - Include: error message, logs, diagnostics
   - Describe: what you were doing, what happened

4. **Ask community**
   - [GitHub Discussions](https://github.com/devflow/devflow-agent/discussions)
   - [Slack Community](https://devflow-community.slack.com)

---

**Last Updated:** 2025-01-24  
**Version:** 0.2.0
