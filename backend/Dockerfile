# Build Stage (Dependencies)
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

RUN npm ci --workspace=backend --omit=dev

#  Build Stage (App Compilation)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Production Stage
FROM node:20-alpine AS runner
WORKDIR /app

USER node

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=5001

# Copy over required backend files (explicit)
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

COPY --chown=node:node backend/package.json ./backend/
COPY --chown=node:node backend/server.js backend/app.js ./backend/
COPY --chown=node:node backend/config ./backend/config

# To be implemented later
# COPY --chown=node:node backend/models ./backend/models
# COPY --chown=node:node backend/routes  ./backend/routes
# COPY --chown=node:node backend/utils   ./backend/utils
# COPY --chown=node:node backend/validators ./backend/validators

WORKDIR /app/backend

EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "server.js"]