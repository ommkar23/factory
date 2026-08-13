FROM node:24-bookworm

# node:24-bookworm already supplies the non-root `node` user (UID/GID 1000).
RUN corepack enable && corepack prepare pnpm@11.21.0 --activate

WORKDIR /workspace
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN mkdir -p /pnpm && chown -R node:node /workspace /pnpm

USER node
CMD ["pnpm", "--version"]
