# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable
WORKDIR /app

# ---------------------------------------------------------------------------
# builder: instala tudo (incl. devDependencies) e compila
# ---------------------------------------------------------------------------
FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @escola/api...
RUN pnpm --filter @escola/contracts build
RUN pnpm --filter @escola/api exec prisma generate
RUN pnpm --filter @escola/api build

# ---------------------------------------------------------------------------
# runner: só produção
# ---------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN pnpm install --frozen-lockfile --prod --filter @escola/api...

COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma

WORKDIR /app/apps/api
ENV NODE_OPTIONS="--max-old-space-size=384"
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
