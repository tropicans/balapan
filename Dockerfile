# ===================================================
# Multi-stage Dockerfile for DGDash Racing System
# Production-hardened with non-root security & healthcheck
# ===================================================

# Stage 1: Build Frontend SPA
FROM node:20-alpine AS client-builder
WORKDIR /app/client

# Install frontend dependencies cleanly
COPY client/package*.json ./
RUN npm ci --no-audit

# Copy frontend source and compile production bundle
COPY client/ ./
RUN npm run build

# Stage 2: Production Server Runner
FROM node:20-alpine AS runner

LABEL maintainer="DGDash Racing System Team"
LABEL description="Production container for DGDash Tamiya Digital Racing System"
LABEL version="1.1.0"

WORKDIR /app

# Production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/tamiya.sqlite

# Install root/server production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev --no-audit

# Copy backend application
COPY server/ ./server/

# Copy compiled frontend assets from Stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Prepare persistent data directory and enforce non-root permissions
RUN mkdir -p /app/data && chown -R node:node /app

# Switch to non-root user (built into node-alpine)
USER node

# Persistent volume for SQLite WASM database
VOLUME ["/app/data"]

# Expose HTTP and WebSocket port
EXPOSE 3000

# Docker Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

# Start production server
CMD ["node", "server/index.js"]
