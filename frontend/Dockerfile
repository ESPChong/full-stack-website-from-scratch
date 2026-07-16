# Build Stage (Dependencies)
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

RUN npm ci --workspace=frontend --include-workspace-root

# Build Stage (App Compilation)
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ ./frontend/

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/frontend
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner
WORKDIR /app

USER node

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Copy over required frontend files
COPY --from=builder --chown=node:node /app/frontend/.next/standalone ./
COPY --from=builder --chown=node:node /app/frontend/public ./frontend/public
COPY --from=builder --chown=node:node /app/frontend/.next/static ./frontend/.next/static

WORKDIR /app/frontend

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=10s --start-period=20s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/ || exit 1

CMD ["node", "server.js"]