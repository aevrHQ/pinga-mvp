# DevFlow: Managed SaaS vs Self-Hosted Architecture

DevFlow supports two deployment models: **Managed SaaS** and **Self-Hosted**. This document explains the differences, architecture, and setup for each.

## Quick Comparison

| Aspect | Managed SaaS | Self-Hosted |
|--------|-------------|------------|
| **User Experience** | Sign up, connect GitHub, done | Run infrastructure yourself |
| **GitHub Credentials** | Platform manages securely | You manage your own token |
| **Scalability** | Shared infrastructure | Single machine/cluster |
| **Cost** | Per-user subscription | Your infrastructure costs |
| **Privacy** | Some data stored on platform | All data stays on your infrastructure |
| **Best For** | Teams wanting ease of use | Organizations wanting full control |

## Architecture Diagrams

### Managed SaaS Mode

```
User (Web)
    ↓
devflow-web.vercel.app
    ├─ GitHub OAuth Login (user authenticates with their GitHub)
    ├─ Store encrypted user's GitHub token
    └─ Create task with encrypted token
        ↓
Platform API (/api/copilot/command)
    ├─ Fetch user's encrypted token from database
    ├─ Include in DevflowRequest.credentials
    └─ Forward to agent-host
        ↓
Agent-Host (Railway/Render/Fly.io)
    ├─ Receive encrypted credentials
    ├─ Decrypt using shared CREDENTIAL_ENCRYPTION_KEY
    ├─ Create Copilot session with user's token
    └─ Execute workflow with user's permissions
        ↓
GitHub (using user's credentials)
    ├─ Create PRs as the user
    ├─ Push branches as the user
    └─ All actions appear under user's account

✅ Single agent-host serves many users
✅ Each user uses their own GitHub credentials
✅ User controls access (can revoke anytime)
✅ Scalable to 1000+ users
```

### Self-Hosted Mode

```
User (CLI)
    ↓
devflow init (local auth)
    ↓
devflow start (polls platform)
    ↓
User's agent-host (localhost or VPS)
    ├─ Uses GITHUB_TOKEN environment variable
    ├─ Creates Copilot session with that token
    └─ Execute workflow
        ↓
GitHub (using self-hosted token)
    ├─ Create PRs with that token
    ├─ Push branches with that token
    └─ Actions appear under that account

✅ User runs their own infrastructure
✅ User manages their own GitHub token
✅ No shared credentials
✅ Complete control and privacy
```

## How Credential Encryption Works

### 1. Platform (devflow-web) Encrypts

When a user creates a task:

```typescript
// apps/web/lib/credentialEncryption.ts
const userToken = user.githubToken; // Already stored from OAuth
const encrypted = encryptCredentials({ github: userToken });

// Format: iv:ciphertext:authtag
// Example: "a1b2c3d4e5f6...:encrypted_data:auth_tag"
```

### 2. Platform Passes to Agent-Host

```typescript
// apps/web/app/api/copilot/command/route.ts
const devflowRequest = {
  taskId: "...",
  credentials: {
    github: encrypted_token, // Encrypted!
  },
  // ... other fields
};

await fetch(`${AGENT_HOST_URL}/command`, {
  body: JSON.stringify(devflowRequest),
});
```

### 3. Agent-Host Decrypts

```typescript
// apps/agent-host/src/credentials.ts
const credentials = decryptCredentials(
  devflowRequest.credentials,
  process.env.CREDENTIAL_ENCRYPTION_KEY
);

const userGitHubToken = credentials.github;

// Use in tools
createOpenPullRequestTool(userGitHubToken);
```

## Environment Variables

### Managed SaaS (Platform)

```bash
# apps/web/.env
JWT_SECRET=your-long-secret-key
DEVFLOW_API_SECRET=your-api-secret
CREDENTIAL_ENCRYPTION_KEY=your-encryption-key-32-bytes-min
MONGODB_URI=your-mongodb-connection-string
GITHUB_OAUTH_CLIENT_ID=your-github-app-id
GITHUB_OAUTH_CLIENT_SECRET=your-github-app-secret
AGENT_HOST_URL=https://your-agent-host-url
```

### Managed SaaS (Agent-Host)

```bash
# apps/agent-host/.env (deployed to Railway/Render/Fly.io)
NODE_ENV=production
PORT=3001
PINGA_API_URL=https://devflow-web.vercel.app
MONGODB_URI=your-mongodb-connection-string
CREDENTIAL_ENCRYPTION_KEY=same-key-as-platform
COPILOT_MODEL=gpt-4.1

# Optional: for fallback (self-hosted mode)
GITHUB_TOKEN=your-token (NOT NEEDED in managed mode)
```

### Self-Hosted

```bash
# apps/web/.env (local only)
JWT_SECRET=your-long-secret-key
DEVFLOW_API_SECRET=your-api-secret
MONGODB_URI=your-mongodb-connection-string
GITHUB_OAUTH_CLIENT_ID=your-github-app-id
GITHUB_OAUTH_CLIENT_SECRET=your-github-app-secret
AGENT_HOST_URL=http://localhost:3001
```

```bash
# apps/agent-host/.env (self-hosted)
NODE_ENV=production
PORT=3001
PINGA_API_URL=http://localhost:3000 (your platform)
MONGODB_URI=your-mongodb-connection-string
COPILOT_MODEL=gpt-4.1

# Required for self-hosted: provide your own GitHub token
GITHUB_TOKEN=ghp_your_personal_access_token
```

## Setup Instructions

### Option A: Deploy Managed SaaS (Recommended for Teams)

#### Step 1: Deploy Platform to Vercel

```bash
cd apps/web
vercel deploy
```

Set environment variables in Vercel dashboard:
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `DEVFLOW_API_SECRET` - Generate with: `openssl rand -base64 32`
- `CREDENTIAL_ENCRYPTION_KEY` - Generate 32-byte key with: `openssl rand -base64 32`
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `GITHUB_OAUTH_CLIENT_ID` - From GitHub App
- `GITHUB_OAUTH_CLIENT_SECRET` - From GitHub App

#### Step 2: Deploy Agent-Host to Railway/Render

See `RENDER_DOCKER_DEPLOYMENT.md` or `AGENT_HOST_DEPLOYMENT.md`

Set environment variables:
- `PINGA_API_URL` = `https://your-vercel-url`
- `CREDENTIAL_ENCRYPTION_KEY` = Same key as platform!
- `MONGODB_URI` = Same as platform
- `COPILOT_MODEL` = `gpt-4.1`

#### Step 3: Users Sign Up

1. Visit `https://your-vercel-url`
2. Click "Sign up with GitHub"
3. Authorize to connect their GitHub account
4. Platform stores encrypted access token
5. Users create tasks through web UI
6. Agent-host executes with their credentials

#### Security Notes

- Encryption key MUST be identical on platform and agent-host
- Use strong encryption keys (32+ bytes)
- Store encryption key securely (use platform secrets, not in code)
- Credentials encrypted at rest and in transit
- Users can revoke access anytime by re-authorizing

### Option B: Self-Hosted (Recommended for Organizations)

#### Step 1: Deploy Platform Locally or to VPS

```bash
# Clone repository
git clone <your-repo>
cd apps/web

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
JWT_SECRET=$(openssl rand -base64 32)
DEVFLOW_API_SECRET=$(openssl rand -base64 32)
MONGODB_URI=your-mongodb-uri
GITHUB_OAUTH_CLIENT_ID=your-github-app-id
GITHUB_OAUTH_CLIENT_SECRET=your-github-app-secret
AGENT_HOST_URL=http://localhost:3001
EOF

# Start platform
npm run dev
```

#### Step 2: Deploy Agent-Host Locally or to VPS

```bash
cd apps/agent-host

# Create .env
cat > .env << EOF
NODE_ENV=production
PORT=3001
PINGA_API_URL=http://your-platform-url
MONGODB_URI=your-mongodb-uri
COPILOT_MODEL=gpt-4.1
GITHUB_TOKEN=ghp_your_personal_access_token
EOF

# Build and run
npm run build
npm start
```

Or with Docker:

```bash
# Build
docker build -t devflow-agent-host .

# Run
docker run \
  -p 3001:3001 \
  -e PINGA_API_URL=http://your-platform-url \
  -e GITHUB_TOKEN=ghp_your_personal_access_token \
  -e MONGODB_URI=your-mongodb-uri \
  devflow-agent-host
```

#### Step 3: Users Install CLI

```bash
npm install -g @untools/devflow
devflow init
devflow start
```

#### Security Notes

- NO credential encryption needed (everything stays on your infrastructure)
- GITHUB_TOKEN only stored in agent-host, not transmitted
- All data stays within your infrastructure
- Suitable for organizations with strict data residency requirements

## Hybrid Approach

You can also support **both** models simultaneously:

```
Managed SaaS Users
    ↓ (GitHub OAuth)
devflow-web.vercel.app
    ├─ Public facing
    └─ Provides managed option
    
Self-Hosted Users
    ↓ (Self-installed)
Their own devflow-web instance
    ├─ Private infrastructure
    └─ Provides self-hosted option
```

Platform code supports both automatically:
- If credentials are provided (managed): use them
- If no credentials (self-hosted): fall back to GITHUB_TOKEN env var

## Migration Between Modes

### From Self-Hosted to Managed SaaS

1. Export user data and tasks from self-hosted platform
2. Users sign up on managed SaaS with GitHub OAuth
3. Platform automatically encrypts their GitHub token
4. Import previous tasks

### From Managed SaaS to Self-Hosted

1. Export tasks and platform data
2. Deploy your own instance
3. Set GITHUB_TOKEN in your agent-host
4. Import exported tasks

## Troubleshooting

### "Invalid credentials" Error

**Managed SaaS:**
- Check CREDENTIAL_ENCRYPTION_KEY is identical on platform and agent-host
- Verify user's GitHub token is valid (might have expired)
- Check MongoDB connection

**Self-Hosted:**
- Verify GITHUB_TOKEN is set and valid
- Check GitHub API access scopes

### "Agent-host can't decrypt credentials"

**Cause:** Encryption key mismatch between platform and agent-host

**Solution:**
```bash
# Verify both have same key
echo $CREDENTIAL_ENCRYPTION_KEY  # On platform
echo $CREDENTIAL_ENCRYPTION_KEY  # On agent-host

# They should be identical
```

### "One agent-host for multiple users" (Managed SaaS)

This is the whole point! Each request includes the user's encrypted token, so one agent-host can safely serve unlimited users.

### "My self-hosted token leaked"

If your GITHUB_TOKEN is compromised:

1. Immediately revoke the token on GitHub
2. Generate a new personal access token
3. Update GITHUB_TOKEN environment variable
4. Restart agent-host

## Performance Considerations

### Managed SaaS

- One agent-host can handle ~100-1000 concurrent tasks
- Decryption adds <1ms per request
- Recommend upgrading agent-host tier as load increases

### Self-Hosted

- Single machine limits based on CPU/RAM
- Horizontal scaling requires load balancer
- Docker Compose template available for multi-container setups

## Licensing & Open Source

- Core code is open source (MIT License)
- Managed SaaS provided as hosted service
- Self-hosted version available to run locally
- Users contribute or fork as needed

## Next Steps

1. **For Managed SaaS:** Deploy platform to Vercel, agent-host to Railway
2. **For Self-Hosted:** Follow local deployment guide
3. **For Organizations:** Consider hybrid approach with both options

See `AGENT_HOST_DEPLOYMENT.md` for deployment details.
