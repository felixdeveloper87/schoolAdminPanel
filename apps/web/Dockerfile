# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# ---------------------------------------------------------------------------
# builder
# ---------------------------------------------------------------------------
FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/contracts ./packages/contracts
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile --filter @escola/web...
RUN pnpm --filter @escola/contracts build
RUN pnpm --filter @escola/web build

# ---------------------------------------------------------------------------
# runner: next.config.js output=standalone -> imagem final mínima
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

WORKDIR /app/apps/web
ENV NODE_OPTIONS="--max-old-space-size=256"
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
