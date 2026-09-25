FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@12.5.1 --activate
WORKDIR /app

# Copy root and workspace definitions
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/bot/ ./apps/bot/

# Install dependencies and build bot
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @cargona/types build && \
    pnpm --filter @cargona/bot build

ENV NODE_ENV=production

CMD ["node", "apps/bot/dist/index.mjs"]
