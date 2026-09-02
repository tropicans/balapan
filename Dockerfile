# Multi-stage Dockerfile for Tamiya Digital Racing System
# Stage 1: Build Frontend
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install root & server dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy server files
COPY server/ ./server/

# Copy built frontend assets from stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Persistent data directory for SQLite
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000

CMD ["node", "server/index.js"]
