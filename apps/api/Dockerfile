FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@12.5.1 --activate
WORKDIR /app

# Copy root and workspace definitions
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cargona/types build && \
    pnpm --filter @cargona/db build && \
    pnpm --filter @cargona/api build

ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/app/data

VOLUME ["/app/data"]
EXPOSE 4000

CMD ["node", "apps/api/dist/server.mjs"]
