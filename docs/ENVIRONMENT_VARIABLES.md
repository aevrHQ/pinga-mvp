# Environment Variables Configuration

This guide explains how to configure DevFlow with environment variables for development, staging, and production environments.

## ✅ Critical vs Optional

### 🔴 CRITICAL (Must be set before deployment)

- `JWT_SECRET` - Used to sign JWT tokens
- `DEVFLOW_API_SECRET` - Used to authenticate API requests
- `ACCESS_TOKEN_SECRET` - Used for user session tokens
- `MONGODB_URI` - Database connection

### 🟠 HIGH (Required for features to work)

- `GITHUB_CLIENT_ID` - GitHub OAuth app ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app secret
- `GITHUB_APP_ID` - GitHub App ID
- Platform URLs (`NEXT_PUBLIC_BASE_URL`, `AGENT_HOST_URL`, etc.)

### 🟡 MEDIUM (Optional but recommended)

- Token expiration values
- Polling intervals
- Email configuration
- Groq/LLM API keys

---

## Quick Start

### Step 1: Generate Strong Secrets

Generate cryptographically secure secrets for production:

```bash
# Generate a 32-character hex string (recommended)
openssl rand -hex 32

# Do this 3 times for:
# 1. JWT_SECRET
# 2. DEVFLOW_API_SECRET
# 3. ACCESS_TOKEN_SECRET
```

Example output:

```
gh_copilot_secret
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4
```

### Step 2: Configure .env.local for Development

Copy `.env.example` to `.env.local` in each app:

```bash
# In each app directory (agent, agent-host, web)
cp .env.example .env.local
```

Then edit `.env.local` with your values:

```bash
# apps/web/.env.local
JWT_SECRET=your-generated-secret-here
DEVFLOW_API_SECRET=your-generated-secret-here
ACCESS_TOKEN_SECRET=your-generated-secret-here
MONGODB_URI=mongodb://localhost:27017/devflow
GITHUB_CLIENT_ID=gh_client_id
GITHUB_CLIENT_SECRET=gh_client_secret
```

### Step 3: Verify Setup

Test that all required variables are set:

```bash
# In each app, try to start it
npm run dev

# If any critical variable is missing, you'll see:
# ❌ CRITICAL: [VARIABLE_NAME] environment variable is not set!
```

---

## All Environment Variables

### Platform & Server Configuration

| Variable                | Type   | Default                          | Description                               |
| ----------------------- | ------ | -------------------------------- | ----------------------------------------- |
| `PLATFORM_URL`          | string | `https://devflow-web.vercel.app` | DevFlow SaaS platform URL                 |
| `NEXT_PUBLIC_BASE_URL`  | string | `http://localhost:3000`          | Web app base URL (public)                 |
| `NEXT_PUBLIC_PINGA_URL` | string | `http://localhost:3000`          | Platform base URL (public)                |
| `AGENT_HOST_URL`        | string | `http://localhost:3001`          | Agent-host server URL                     |
| `PINGA_API_URL`         | string | `http://localhost:3000`          | Platform API URL (internal)               |
| `PORT`                  | number | `3001`                           | Server port                               |
| `NODE_ENV`              | string | `development`                    | `development`, `staging`, or `production` |

### Authentication & Security

| Variable                        | Type   | Default   | Description                             | Critical? |
| ------------------------------- | ------ | --------- | --------------------------------------- | --------- |
| `JWT_SECRET`                    | string | _(none)_  | Secret for signing JWT tokens           | ✅ YES    |
| `ACCESS_TOKEN_SECRET`           | string | _(none)_  | Secret for user session tokens          | ✅ YES    |
| `DEVFLOW_API_SECRET`            | string | _(none)_  | Secret for API endpoint authentication  | ✅ YES    |
| `ACCESS_TOKEN_EXPIRY`           | string | `3h`      | User token expiration                   | No        |
| `JWT_EXPIRY`                    | string | `30d`     | Agent token expiration                  | No        |
| `MAGIC_LINK_EXPIRY_MS`          | number | `900000`  | Magic link expiration (ms)              | No        |
| `SESSION_EXPIRY_KEEP_SIGNED_IN` | number | `2592000` | Session with "keep signed in" (seconds) | No        |
| `SESSION_EXPIRY_DEFAULT`        | number | `86400`   | Default session expiration (seconds)    | No        |

### GitHub Configuration

| Variable                    | Type   | Default                                          | Description                | Critical? |
| --------------------------- | ------ | ------------------------------------------------ | -------------------------- | --------- |
| `GITHUB_APP_ID`             | string | `gh_app_id`                                      | GitHub App ID              | ✅ YES    |
| `GITHUB_CLIENT_ID`          | string | `gh_client_id`                                   | GitHub OAuth Client ID     | ✅ YES    |
| `GITHUB_CLIENT_SECRET`      | string | _(none)_                                         | GitHub OAuth Client Secret | ✅ YES    |
| `GITHUB_TOKEN`              | string | _(none)_                                         | GitHub PAT for API access  | No        |
| `GITHUB_OAUTH_REDIRECT_URI` | string | `http://localhost:3000/api/auth/github/callback` | OAuth callback URL         | No        |

### Copilot & AI Configuration

| Variable                   | Type   | Default                  | Description                                |
| -------------------------- | ------ | ------------------------ | ------------------------------------------ |
| `COPILOT_MODEL`            | string | `gpt-4.1`                | Copilot model to use                       |
| `COPILOT_CLI_URL`          | string | _(none)_                 | External Copilot CLI server URL (optional) |
| `GROQ_API_KEY`             | string | _(none)_                 | Groq API key for transcription             |
| `GROQ_MODEL`               | string | `llama-3.1-8b-instant`   | Groq model name                            |
| `GROQ_TRANSCRIPTION_MODEL` | string | `whisper-large-v3-turbo` | Whisper model for transcription            |

### Database

| Variable      | Type   | Default                             | Description               | Critical? |
| ------------- | ------ | ----------------------------------- | ------------------------- | --------- |
| `MONGODB_URI` | string | `mongodb://localhost:27017/devflow` | MongoDB connection string | ✅ YES    |

### Data Retention (TTL)

| Variable                    | Type   | Default     | Description                     |
| --------------------------- | ------ | ----------- | ------------------------------- |
| `MAGIC_LINK_TTL_SECONDS`    | number | `900`       | Magic link auto-delete (15 min) |
| `WEBHOOK_EVENT_TTL_DAYS`    | number | `7`         | Webhook events retention        |
| `NOTIFICATION_LOG_TTL_DAYS` | number | `7`         | Notification logs retention     |
| `PAYLOAD_TTL_HOURS`         | number | `24`        | Webhook payload retention       |
| `STATS_WINDOW_MS`           | number | `86400000`  | Stats calculation window (24h)  |
| `DAILY_ACTIVITY_WINDOW_MS`  | number | `604800000` | Activity stats window (7d)      |

### Polling & Intervals

| Variable                | Type   | Default | Description                 |
| ----------------------- | ------ | ------- | --------------------------- |
| `POLL_INTERVAL_MS`      | number | `5000`  | Agent polling interval (ms) |
| `HEARTBEAT_INTERVAL_MS` | number | `30000` | Heartbeat interval (ms)     |

### Email Configuration

| Variable       | Type   | Default                       | Description                         |
| -------------- | ------ | ----------------------------- | ----------------------------------- |
| `MAIL_FROM`    | string | `notifications@devflow.local` | From email address                  |
| `MAIL_SERVICE` | string | `gmail`                       | Email service provider              |
| `MAIL_USER`    | string | _(none)_                      | Email account username              |
| `MAIL_PASS`    | string | _(none)_                      | Email account password/app password |

### Chat Integrations

| Variable               | Type   | Default  | Description              |
| ---------------------- | ------ | -------- | ------------------------ |
| `TELEGRAM_BOT_TOKEN`   | string | _(none)_ | Telegram bot token       |
| `TELEGRAM_CHAT_ID`     | string | _(none)_ | Telegram default chat ID |
| `SLACK_CLIENT_ID`      | string | _(none)_ | Slack OAuth client ID    |
| `SLACK_CLIENT_SECRET`  | string | _(none)_ | Slack OAuth secret       |
| `SLACK_BOT_TOKEN`      | string | _(none)_ | Slack bot token          |
| `SLACK_SIGNING_SECRET` | string | _(none)_ | Slack signing secret     |

### Logging & Monitoring

| Variable    | Type   | Default | Description                                 |
| ----------- | ------ | ------- | ------------------------------------------- |
| `LOG_LEVEL` | string | `info`  | Log level: `debug`, `info`, `warn`, `error` |

---

## Environment-Specific Examples

### Development (.env.local)

```env
# Platform URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
AGENT_HOST_URL=http://localhost:3001
MONGODB_URI=mongodb://localhost:27017/devflow

# Secrets (Generate with: openssl rand -hex 32)
JWT_SECRET=dev-secret-do-not-use-in-production-12345678
DEVFLOW_API_SECRET=dev-api-secret-12345678
ACCESS_TOKEN_SECRET=dev-token-secret-12345678

# GitHub (from https://github.com/settings/apps/the-devflow-bot)
GITHUB_APP_ID=gh_app_id
GITHUB_CLIENT_ID=gh_client_id
GITHUB_CLIENT_SECRET=gh_copilot_secret

# Optional - for testing
NODE_ENV=development
LOG_LEVEL=debug
```

### Staging

```env
# Platform URLs
NEXT_PUBLIC_BASE_URL=https://staging.devflow.dev
AGENT_HOST_URL=https://api-staging.devflow.dev
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/devflow-staging

# Secrets (Different from production!)
JWT_SECRET=[generate-new-secret]
DEVFLOW_API_SECRET=[generate-new-secret]
ACCESS_TOKEN_SECRET=[generate-new-secret]

# GitHub
GITHUB_CLIENT_SECRET=[staging-secret]

# Settings
NODE_ENV=production
LOG_LEVEL=info
```

### Production

```env
# Platform URLs
NEXT_PUBLIC_BASE_URL=https://devflow.dev
AGENT_HOST_URL=https://api.devflow.dev
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/devflow-prod

# Secrets (Strong, unique per environment!)
JWT_SECRET=[strong-production-secret]
DEVFLOW_API_SECRET=[strong-production-secret]
ACCESS_TOKEN_SECRET=[strong-production-secret]

# GitHub (registered with production domain)
GITHUB_CLIENT_SECRET=[production-secret]

# Settings
NODE_ENV=production
LOG_LEVEL=warn
```

---

## Where to Set Environment Variables

### Local Development

- Create `.env.local` in each app
- Add to `.gitignore` (already done)
- Loaded automatically by Next.js and Node.js (dotenv)

### Docker Deployment

- Pass via `-e` flags: `docker run -e JWT_SECRET=xxx`
- Or use `.env` file: `docker run --env-file .env`

### Vercel Deployment

- Set in Project Settings → Environment Variables
- Supports different values per environment (Preview/Production)
- Automatically injected at build time

### Railway / Heroku / Render

- Set via dashboard or CLI
- Example:
  ```bash
  heroku config:set JWT_SECRET=xxx
  railway variables set JWT_SECRET=xxx
  ```

### GitHub Actions (CI/CD)

- Set as GitHub Secrets: Settings → Secrets and Variables
- Use in workflow:
  ```yaml
  env:
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
  ```

---

## Security Best Practices

### DO:

✅ **Generate strong secrets** using `openssl rand -hex 32`
✅ **Keep .env.local in .gitignore** - never commit secrets
✅ **Use different secrets per environment** (dev/staging/prod)
✅ **Rotate secrets every 90 days** in production
✅ **Store production secrets in secure vaults** (1Password, AWS Secrets Manager, etc.)
✅ **Use GitHub Secrets** for CI/CD workflows
✅ **Validate environment variables on startup** (we do this - app exits if critical var missing)
✅ **Document required variables** in .env.example

### DON'T:

❌ **Don't commit .env.local or .env to git**
❌ **Don't use same secrets in multiple environments**
❌ **Don't hardcode secrets in source code**
❌ **Don't log environment variables** in output
❌ **Don't share secrets via email, Slack, or chat**
❌ **Don't use weak secrets** (generate with openssl)
❌ **Don't expose .env files in Docker images**
❌ **Don't disable validation checks**

---

## Troubleshooting

### "❌ CRITICAL: [VARIABLE] environment variable is not set!"

This means a required variable is missing. Check:

1. Is `.env.local` in the correct directory?
2. Is the variable name spelled correctly?
3. Are there any extra spaces around the `=`?
4. Did you restart the dev server after creating `.env.local`?

### "Invalid JWT Secret" or "Token verification failed"

Make sure:

- `JWT_SECRET` is the same across all apps
- You didn't change `JWT_SECRET` after issuing tokens (invalidates all existing tokens)
- The secret is long enough (32+ characters recommended)

### "Unauthorized" or "Invalid API Secret"

Check:

- Is `DEVFLOW_API_SECRET` set in `.env.local`?
- Is it the same value you're sending in the `X-API-Secret` header?
- Did you escape special characters if the secret contains them?

### "Cannot connect to MongoDB"

Verify:

- Is `MONGODB_URI` correct?
- Is MongoDB running locally (`mongod`) or is the remote server reachable?
- Check connection string format: `mongodb://user:pass@host:port/db`
- Try connection string without authentication first to isolate the issue

### GitHub OAuth "Invalid redirect_uri"

Make sure:

- `GITHUB_OAUTH_REDIRECT_URI` matches exactly what's in GitHub App settings
- No trailing slashes
- Protocol must match (http vs https)
- Rebuild your app after changing this variable

---

## Migration: Adding New Environment Variables

When adding a new environment variable to the codebase:

1. **Update source code** to read from `process.env`
2. **Update `.env.example`** with the new variable
3. **Update this file** (ENVIRONMENT_VARIABLES.md)
4. **Update deployment docs** if it affects deployment
5. **Provide migration guide** if existing deployments need updates

Example:

```typescript
// In your code
const myNewVar = process.env.MY_NEW_VAR || "default-value";

// In .env.example
MY_NEW_VAR = example - value;
```

---

## Further Reading

- [GitHub App Setup Guide](./GITHUB_APP_SETUP.md)
- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Getting Started Guide](./GETTING_STARTED.md)

---

## Support

If you have questions about environment variables:

1. Check this guide and linked documentation
2. Review the `.env.example` files
3. Check application startup logs
4. Open an issue on GitHub with your configuration (redact secrets!)
