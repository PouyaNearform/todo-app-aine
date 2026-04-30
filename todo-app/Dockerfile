# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22-alpine

# ---------- builder stage ----------
# Installs all deps (incl. dev), runs pnpm build.
FROM node:${NODE_VERSION} AS builder
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---------- prod-deps stage ----------
# Installs production-only deps for the runtime image.
FROM node:${NODE_VERSION} AS prod-deps
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---------- runtime stage ----------
# Slim image: build output + production node_modules + non-root user.
FROM node:${NODE_VERSION}
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app/build ./build
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json pnpm-lock.yaml ./
COPY --chown=node:node db/migrate.mjs ./db/migrate.mjs
COPY --chown=node:node db/migrations ./db/migrations
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD wget -qO- --spider http://localhost:3000/ || exit 1
CMD ["sh", "-c", "node db/migrate.mjs && exec node_modules/.bin/react-router-serve ./build/server/index.js"]
