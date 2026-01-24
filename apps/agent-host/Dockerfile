# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and tsconfig (when root dir is apps/agent-host)
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

# Install dependencies
RUN npm install

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init and curl for health checks
RUN apk add --no-cache dumb-init curl

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Health check - increased start period to 15s to allow server startup
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
