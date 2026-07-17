# ---- Build Stage (Dependencies) ----
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

# Production-only dependencies (no devDeps)
RUN npm ci --workspace=backend --omit=dev

# ---- Production Stage ----
FROM node:20-alpine AS runner
WORKDIR /app

# Non-root user
USER node

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=5001

# Copy production dependencies
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copy application source
COPY --chown=node:node backend/package.json ./backend/
COPY --chown=node:node backend/server.js backend/app.js ./backend/
COPY --chown=node:node backend/config ./backend/config
COPY --chown=node:node backend/models ./backend/models
COPY --chown=node:node backend/routes  ./backend/routes
COPY --chown=node:node backend/utils   ./backend/utils
COPY --chown=node:node backend/validators ./backend/validators
COPY --chown=node:node backend/workers  ./backend/workers

WORKDIR /app/backend

EXPOSE 5001

# Healthcheck: wget against the /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "server.js"]
