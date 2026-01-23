# DevFlow Production Deployment Guide

Complete guide for deploying DevFlow to production.

## Architecture Overview

DevFlow consists of three independent deployable components:

```
┌─────────────────────────────────────────────────┐
│         DevFlow Web Platform (SaaS)             │
│  - Next.js 16 + Express.js API Routes          │
│  - MongoDB for data persistence                │
│  - Runs on: Vercel, AWS, Azure, etc.          │
└─────────────────────────────────────────────────┘
                       ↑
                       │ (HTTP/REST)
                       │
┌─────────────────────────────────────────────────┐
│    CLI Agent (Self-Hosted on User Machine)     │
│  - Polling daemon for task reception           │
│  - Runs: npm install -g devflow-agent          │
│  - Token-based authentication                  │
└─────────────────────────────────────────────────┘
                       ↓
                       │ (Local HTTP)
                       │
┌─────────────────────────────────────────────────┐
│     Agent-Host (Self-Hosted on User Machine)    │
│  - Workflow execution engine                    │
│  - Copilot SDK integration                      │
│  - Express.js server (port 3001)               │
└─────────────────────────────────────────────────┘
```

---

## Part 1: Deploy Web Platform (SaaS)

### Option A: Vercel (Recommended)

Vercel is optimized for Next.js deployments.

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
cd apps/web
vercel --prod

# 4. Setup environment variables
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add GITHUB_OAUTH_CLIENT_ID
vercel env add GITHUB_OAUTH_CLIENT_SECRET
```

**Expected Output:**
```
✓ Connected to project devflow-web
✓ Deployed to https://devflow.vercel.app
```

### Option B: AWS with EC2 + RDS

For more control and scalability:

```bash
# 1. Launch EC2 instance (t3.medium, Ubuntu 22.04)
# 2. Install Node.js 18+
sudo apt update
sudo apt install nodejs npm
node --version  # Should be 18+

# 3. Clone repository
git clone https://github.com/devflow/devflow-platform.git
cd devflow-platform
npm install

# 4. Create RDS MongoDB instance (or use Atlas)
# Get connection string from AWS console

# 5. Set environment variables
cat > .env.production << EOF
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/devflow
JWT_SECRET=$(openssl rand -base64 32)
GITHUB_OAUTH_CLIENT_ID=xxxx
GITHUB_OAUTH_CLIENT_SECRET=xxxx
NODE_ENV=production
NEXTAUTH_SECRET=$(openssl rand -base64 32)
EOF

chmod 600 .env.production

# 6. Build and start
npm run build
npm run start

# 7. Setup reverse proxy (nginx)
sudo apt install nginx
# Configure nginx to forward :80 → :3000
```

### Option C: Docker

For reproducible deployments:

```dockerfile
# Create Dockerfile in apps/web
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build
COPY . .
RUN npm run build

# Start
EXPOSE 3000
CMD ["npm", "start"]
```

Deploy with Docker Compose:

```yaml
version: '3.8'
services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      MONGODB_URI: ${MONGODB_URI}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - mongodb
  
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

Start with:
```bash
docker-compose up -d
```

---

## Part 2: Configure Environment Variables

### Required Variables for Web Platform

```bash
# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/devflow

# JWT/Security
JWT_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://devflow.dev

# GitHub OAuth
GITHUB_OAUTH_CLIENT_ID=Ov23lixxxxx
GITHUB_OAUTH_CLIENT_SECRET=xxxxxxxxxxxx

# Application
NODE_ENV=production
APP_URL=https://devflow.dev
API_URL=https://devflow.dev/api

# Optional: Slack Integration
SLACK_BOT_TOKEN=xoxb-xxxxx
SLACK_SIGNING_SECRET=xxxxx

# Optional: Telegram Integration
TELEGRAM_BOT_TOKEN=123456:ABC-DEF
```

### Setup Secrets Vault

For production, use a secrets manager:

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name devflow-jwt-secret \
  --secret-string "$(openssl rand -base64 32)"
```

**HashiCorp Vault:**
```bash
vault write secret/devflow \
  mongodb_uri="mongodb+srv://..." \
  jwt_secret="..." \
  github_client_id="..."
```

---

## Part 3: Database Setup

### MongoDB Atlas (Recommended)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster (M2 free tier for testing, M5+ for production)
3. Create database user with strong password
4. Whitelist IP addresses
5. Get connection string

### Self-Hosted MongoDB

```bash
# Ubuntu
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
apt-get install -y mongodb-org
systemctl start mongod

# Or with Docker
docker run -d \
  --name mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -p 27017:27017 \
  mongo:6
```

### Create Indexes

```bash
# Connect to MongoDB
mongosh "mongodb+srv://user:password@cluster.mongodb.net/devflow"

# Create indexes for performance
db.users.createIndex({ email: 1 }, { unique: true })
db.agents.createIndex({ userId: 1 })
db.agents.createIndex({ status: 1 })
db.tasks.createIndex({ userId: 1 })
db.tasks.createIndex({ agentId: 1 })
db.tasks.createIndex({ status: 1 })
db.agentTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

---

## Part 4: Security Hardening

### SSL/TLS Certificates

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d devflow.dev

# Or use AWS Certificate Manager for free
```

### Security Headers

Add to nginx/Apache:

```nginx
# Strict-Transport-Security
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Content-Security-Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" always;

# X-Frame-Options
add_header X-Frame-Options "DENY" always;

# X-Content-Type-Options
add_header X-Content-Type-Options "nosniff" always;

# X-XSS-Protection
add_header X-XSS-Protection "1; mode=block" always;
```

### Rate Limiting

In Next.js API routes:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
});

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  const result = await ratelimit.limit(ip);

  if (!result.success) {
    return Response.json({ error: "Rate limited" }, { status: 429 });
  }

  // ... handle request
}
```

### CORS Configuration

```typescript
// apps/web/app/api/route-config.ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.APP_URL || "https://devflow.dev",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
```

---

## Part 5: Monitoring & Observability

### Setup Logging

Use structured logging for debugging:

```bash
# Install logging library
npm install winston

# Export logs to:
# - File system (local)
# - Cloud logging (Cloudwatch, Stackdriver, Datadog)
# - Error tracking (Sentry, Rollbar)
```

### Setup Monitoring

**Using Vercel (Built-in):**
- Real-time analytics
- Error tracking
- Performance monitoring

**Using New Relic:**

```bash
npm install newrelic

# In server.js
require('newrelic');
```

**Using Sentry:**

```bash
npm install @sentry/nextjs

# Configure in next.config.js
withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
```

### Setup Alerting

Create alerts for:

```yaml
- API errors > 5% error rate
- Response time > 3 seconds (p95)
- Database connection failures
- Memory usage > 80%
- Disk usage > 90%
- Agent polling failures
```

---

## Part 6: Backup & Recovery

### Automated Backups

**MongoDB Atlas:**
- Continuous backups (default)
- Point-in-time recovery

**Self-Hosted MongoDB:**

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/mongodb/$(date +%Y-%m-%d)"
mkdir -p $BACKUP_DIR

mongodump \
  --uri="mongodb+srv://user:pass@cluster.mongodb.net/devflow" \
  --out=$BACKUP_DIR

# Upload to S3
aws s3 sync $BACKUP_DIR s3://devflow-backups/

# Cleanup old backups (>30 days)
find /backups/mongodb -type d -mtime +30 -exec rm -rf {} \;
```

**Schedule with cron:**

```bash
0 2 * * * /scripts/backup-mongodb.sh
```

### Disaster Recovery Plan

1. **Detection** → CloudWatch/Monitoring alerts
2. **Notification** → Page on-call engineer
3. **Restoration** → Restore from latest backup
4. **Verification** → Run health checks
5. **Communication** → Status page update

---

## Part 7: CI/CD Pipeline

### GitHub Actions (Recommended)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      
      - run: npm run lint
      
      - run: npm run test
      
      - run: npm run build
      
      - name: Deploy to Vercel
        uses: vercel/action@main
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Pre-deployment Checks

```bash
# .github/workflows/pre-deploy.yml
- name: Type check
  run: npm run type-check

- name: Security audit
  run: npm audit --audit-level=moderate

- name: Build verification
  run: npm run build

- name: Test coverage
  run: npm run test -- --coverage
  
- name: API smoke tests
  run: npm run test:smoke
```

---

## Part 8: Release & Versioning

### Semantic Versioning

```
Major.Minor.Patch
  ↓      ↓      ↓
Breaking Change
         ↓
         New Feature
                  ↓
                  Bug Fix
```

### Release Process

```bash
# 1. Update version
npm version minor  # or major, patch

# 2. Update CHANGELOG
# Add new features, breaking changes, fixes

# 3. Create git tag
git tag v0.3.0
git push origin v0.3.0

# 4. Create GitHub release
# - Title: v0.3.0
# - Notes: Copy from CHANGELOG

# 5. Publish to npm
npm publish
```

---

## Production Checklist

- [ ] All environment variables configured
- [ ] Database backups setup and tested
- [ ] SSL/TLS certificates installed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Logging and monitoring configured
- [ ] Alerts configured for critical metrics
- [ ] Disaster recovery plan documented
- [ ] CI/CD pipeline working
- [ ] Staging environment mirrors production
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Team trained on deployment
- [ ] Runbook created for incident response
- [ ] Status page configured

---

## Deployment Walkthrough

### Day 1: Staging Deployment

```bash
# 1. Deploy to staging environment
vercel --target staging

# 2. Run integration tests
npm run test:integration

# 3. Performance testing
npm run test:load

# 4. Security scanning
npm run security-check

# 5. Smoke tests in staging
npm run test:smoke
```

### Day 2: Production Deployment

```bash
# 1. Create release tag
npm version minor
git push origin v0.3.0

# 2. Deploy to production
vercel --prod

# 3. Monitor error rate
# Expected: < 0.1%

# 4. Monitor response time
# Expected: p95 < 2 seconds

# 5. Verify all features work
# - User signup
# - Agent registration
# - Task creation & execution
# - Notifications
```

### Post-Deployment

```bash
# 1. Monitor for 24 hours
# Watch: errors, performance, usage

# 2. Rollback plan ready
git revert <commit>
vercel --prod --force

# 3. Document any issues
# Update runbook

# 4. Send release notes
# Email team, users, community
```

---

## Support & Maintenance

### On-Call Rotation

```
Week 1: Engineer A
Week 2: Engineer B
Week 3: Engineer C
Week 4: Engineer D
```

### Incident Response

```
1. Alert triggered
   ↓
2. On-call acknowledges (5 min SLA)
   ↓
3. Diagnose issue (15 min)
   ↓
4. Apply fix or rollback (5 min)
   ↓
5. Verify recovery (5 min)
   ↓
6. Post-mortem (24 hours)
```

---

## Production URLs

- **Web Platform:** https://devflow.dev
- **API:** https://api.devflow.dev
- **Status Page:** https://status.devflow.dev
- **Documentation:** https://docs.devflow.dev
- **Support:** support@devflow.dev

---

**Last Updated:** 2025-01-24  
**Status:** Production Ready  
**SLA:** 99.9% uptime commitment
