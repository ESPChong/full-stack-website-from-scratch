# Build Stage (Dependencies)
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

#  Build Stage (App Compilation)
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Production Stage
FROM node:20-alpine AS runner

USER node

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=5001

# Copy over required backend files (explicit)
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

COPY --chown=node:node package.json ./
COPY --chown=node:node server.js app.js ./
COPY --chown=node:node config ./config

# To be implemented later
# COPY --chown=node:node models ./models
# COPY --chown=node:node routes  ./routes
# COPY --chown=node:node utils   ./utils
# COPY --chown=node:node validators ./validators

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "server.js"]