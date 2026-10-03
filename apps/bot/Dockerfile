FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@12.5.1 --activate
WORKDIR /app

# Copy root and workspace definitions
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

# Install dependencies and build bot
RUN pnpm install --ignore-scripts
RUN pnpm --filter @cargona/types build && \
    pnpm --filter @cargona/bot build
RUN pnpm --filter @cargona/bot deploy --prod --legacy --ignore-scripts /runtime

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /runtime/node_modules ./apps/bot/node_modules
COPY --from=builder /runtime/dist ./apps/bot/dist
COPY --from=builder /runtime/package.json ./apps/bot/package.json

ENV NODE_ENV=production

CMD ["node", "apps/bot/dist/index.mjs"]
