# Painel Administrativo — Escola Infantil

Monorepo pnpm com Next.js (frontend), NestJS + Prisma (backend) e PostgreSQL.
Ver [escola-infantil-plataforma-spec.md](./escola-infantil-plataforma-spec.md) para a especificação completa do produto.

## Estrutura

```
apps/
  web/            → Next.js 14 (App Router) + Tailwind + shadcn-style UI
  api/             → NestJS + Prisma
packages/
  contracts/       → Schemas Zod compartilhados (DTOs, enums, labels pt-BR)
```

## Desenvolvimento local

Pré-requisitos: Node 20+, pnpm 9+, Docker (para o Postgres).

```bash
pnpm install

# sobe o Postgres de desenvolvimento (porta 5433)
docker compose -f docker-compose.dev.yml up -d

pnpm --filter @escola/contracts build

# banco de dados
pnpm --filter @escola/api prisma:generate
pnpm --filter @escola/api prisma:migrate      # cria/aplica migrations
pnpm --filter @escola/api prisma:seed         # escola exemplo + usuários + dados fake

# roda API (porta 3002) e Web (porta 3001) juntos
pnpm dev
```

Acesse http://localhost:3001. O seed não cria usuários (só a escola, turmas, alunos e despesas de exemplo).

`POST /api/users` (criação de usuário) exige estar autenticado como ADMIN — então o *primeiro*
usuário de uma escola nova precisa ser inserido direto no banco:

```bash
docker compose -f docker-compose.dev.yml exec postgres psql -U escola -d escola -c "
INSERT INTO app_users (id, \"schoolId\", name, email, \"passwordHash\", role, active)
VALUES (gen_random_uuid()::text, 'seed-school', 'Seu Nome', 'voce@escola.com',
        crypt('sua-senha', gen_salt('bf', 10)), 'ADMIN', true);
"
```

> Requer a extensão `pgcrypto` (`CREATE EXTENSION IF NOT EXISTS pgcrypto;`) para `crypt()`/`gen_salt()`.
> Alternativa mais simples: gerar o hash com `node -e "console.log(require('bcryptjs').hashSync('sua-senha', 10))"`
> e inserir o valor já pronto no `passwordHash`.

Depois de logado como ADMIN, os demais usuários podem ser criados via `POST /api/users`.

Em dev não há nginx: o `next.config.js` faz rewrite de `/api/*` para a API do Nest
(`API_URL`, default `http://localhost:3002`), mantendo a mesma origem do navegador.

## Produção (Docker Compose)

```bash
cp .env.example .env
# edite .env: POSTGRES_PASSWORD e JWT_SECRET

docker compose up -d --build
```

O `nginx` escuta na porta 80 e roteia `/api/*` → `api` (Nest) e o resto → `web` (Next.js),
mesma origem para os dois — sem CORS, cookie JWT httpOnly funciona sem configuração extra.
O container `api` roda `prisma migrate deploy` automaticamente antes de subir.

Para popular o banco de produção pela primeira vez:

```bash
docker compose exec api npx prisma db seed
```

## Convenções importantes

- **Dinheiro sempre em centavos** (`Int`), nunca float. Formatar no frontend com `brl()` (`apps/web/lib/format.ts`).
- **Fuso horário**: `America/Sao_Paulo` — ver `apps/api/src/common/dates.ts`.
- **Multi-tenant desde o dia 1**: todo model de negócio tem `schoolId`; hoje só existe uma escola (seed), mas o isolamento já está em vigor.
- Perfis: `ADMIN` (acesso completo) e `STAFF` (sem financeiro/projeções) — reforçado nos guards do Nest, não só na UI.
- Mensalidades são geradas automaticamente todo dia 1º às 05:00 (`InvoicesCron`) e marcadas como atrasadas diariamente às 06:00.

## Fases

Fase 1 (MVP, implementada): alunos, turmas, matrículas, mensalidades, despesas, dashboard.
Fase 2 (não implementada): relatórios de inadimplência/DRE, gráficos de 12 meses, metas e projeção, lista de espera, rematrícula em lote, export CSV.
Fase 3 (SaaS): cadastro self-service de escolas, presença diária, agenda para pais, funcionários/folha, Redis.
