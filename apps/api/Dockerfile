FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@12.5.1 --activate
WORKDIR /app

# Copy root and workspace definitions
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

# Install dependencies and build
RUN pnpm install --ignore-scripts
RUN pnpm --filter @cargona/types build && \
    pnpm --filter @cargona/db build && \
    pnpm --filter @cargona/api build
RUN pnpm --filter @cargona/api deploy --prod --legacy --ignore-scripts /runtime

# Strip all source code files to protect IP
FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=builder /runtime/node_modules ./apps/api/node_modules
COPY --from=builder /runtime/dist ./apps/api/dist
COPY --from=builder /runtime/package.json ./apps/api/package.json

ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/app/data

VOLUME ["/app/data"]
EXPOSE 4000

CMD ["node", "apps/api/dist/server.mjs"]
