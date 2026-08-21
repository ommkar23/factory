# syntax=docker/dockerfile:1.7
# Build with --build-arg APP=home|weather|live-splash.
FROM node:24-bookworm AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@11.21.0 --activate
WORKDIR /app

# Development image used by compose.yml.
FROM base AS dev
WORKDIR /workspace
RUN mkdir -p /workspace /pnpm && chown -R node:node /workspace /pnpm
USER node
CMD ["pnpm", "--version"]

FROM base AS dependencies

ARG APP

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/home/package.json apps/home/package.json
COPY apps/live-splash/package.json apps/live-splash/package.json
COPY apps/weather/package.json apps/weather/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/ui/package.json packages/ui/package.json

# Do not use BuildKit-only cache mounts: Cloud Build's docker builder uses
# classic `docker build` for the one-time bootstrap images.
RUN test -n "$APP" && \
    test -f "apps/$APP/package.json" && \
    pnpm --filter "@factory/$APP..." install --frozen-lockfile

FROM dependencies AS builder

ARG APP
ARG AUTH_MODE=supabase
ARG FACTORY_SHARED_ORIGIN=false
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV AUTH_MODE=$AUTH_MODE
ENV FACTORY_SHARED_ORIGIN=$FACTORY_SHARED_ORIGIN
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

COPY . .

RUN test -n "$APP" && \
    test -f "apps/$APP/package.json" && \
    pnpm --filter "@factory/$APP" build && \
    mkdir -p "/runtime-public/apps/$APP" && \
    if [ -d "apps/$APP/public" ]; then cp -a "apps/$APP/public/." "/runtime-public/apps/$APP/"; fi

FROM node:24-bookworm-slim AS runner

ARG APP
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
ENV NEXT_TELEMETRY_DISABLED=1
ENV APP_NAME=$APP

WORKDIR /app
RUN groupadd --system --gid 1001 nextjs && \
    useradd --system --uid 1001 --gid nextjs nextjs

COPY --chown=nextjs:nextjs --from=builder /app/apps/${APP}/.next/standalone ./
COPY --chown=nextjs:nextjs --from=builder /app/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --chown=nextjs:nextjs --from=builder /runtime-public/ ./

USER nextjs
EXPOSE 8080
CMD ["sh", "-c", "node apps/$APP_NAME/server.js"]
