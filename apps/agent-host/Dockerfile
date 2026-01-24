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

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
