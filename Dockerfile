# syntax=docker/dockerfile:1.7
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

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/home/package.json apps/home/package.json
COPY apps/live-splash/package.json apps/live-splash/package.json
COPY apps/weather/package.json apps/weather/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN pnpm --filter "@factory/home..." --filter "@factory/live-splash..." --filter "@factory/weather..." install --frozen-lockfile

FROM dependencies AS builder

ARG FACTORY_SHARED_ORIGIN=true
ARG FACTORY_API_URL
ARG LIVE_SPLASH_URL
ARG WEATHER_URL
ENV FACTORY_SHARED_ORIGIN=$FACTORY_SHARED_ORIGIN
ENV FACTORY_API_URL=$FACTORY_API_URL
ENV LIVE_SPLASH_URL=$LIVE_SPLASH_URL
ENV WEATHER_URL=$WEATHER_URL

COPY . .

RUN pnpm --filter @factory/home build && \
    pnpm --filter @factory/live-splash build && \
    pnpm --filter @factory/weather build && \
    for app in home live-splash weather; do \
      mkdir -p "/runtimes/$app/apps/$app/.next" "/runtimes/$app/apps/$app/public"; \
      cp -a "apps/$app/.next/standalone/." "/runtimes/$app/"; \
      cp -a "apps/$app/.next/static" "/runtimes/$app/apps/$app/.next/static"; \
      if [ -d "apps/$app/public" ]; then cp -a "apps/$app/public/." "/runtimes/$app/apps/$app/public/"; fi; \
    done

FROM node:24-bookworm-slim AS standalone-base

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app
RUN groupadd --system --gid 1001 nextjs && useradd --system --uid 1001 --gid nextjs nextjs
USER nextjs
EXPOSE 8080

# Local-only targets for exercising an app as an independent production-style service.
FROM standalone-base AS weather-local
COPY --chown=nextjs:nextjs --from=builder /runtimes/weather /app
CMD ["node", "/app/apps/weather/server.js"]

FROM standalone-base AS live-splash-local
COPY --chown=nextjs:nextjs --from=builder /runtimes/live-splash /app
CMD ["node", "/app/apps/live-splash/server.js"]

# Production remains one unified Home image containing all three runtimes.
FROM standalone-base AS runner
COPY --chown=nextjs:nextjs --from=builder /runtimes /runtimes
COPY --chown=nextjs:nextjs scripts/unified-web.mjs /app/scripts/unified-web.mjs
CMD ["node", "/app/scripts/unified-web.mjs"]
