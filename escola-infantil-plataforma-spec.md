# Plataforma de Gestão — Escola Infantil (build spec para Claude Code)

## 1. Visão geral

Painel administrativo para uma escola infantil no Rio de Janeiro, desenhado desde o dia 1 para virar um SaaS multi-escola. Usuários são administradores/secretaria da escola (não os pais, por enquanto).

**O que o sistema faz:**
- Cadastro e gestão de alunos, responsáveis, turmas e matrículas
- Controle de mensalidades **sem gateway de pagamento**: pais pagam via Pix e mandam comprovante no WhatsApp; a secretaria apenas **marca como pago** no painel
- Controle de inadimplência, com datas de vencimento e cobrança facilitada
- Gestão de despesas por categoria
- Dashboard financeiro: faturamento, receita líquida, projeção, metas de novos alunos, taxa de ocupação
- Nuances de escola infantil: aluno integral vs. meio período, refeição inclusa, alergias/restrições alimentares, pessoas autorizadas a buscar a criança, lista de espera, aniversariantes

**O que NÃO faz (por decisão):**
- Não integra pagamento (Pix é manual)
- Não emite nota fiscal / boleto
- Sem app para os pais no MVP

---

## 2. Stack e restrições técnicas

A VPS é fraca (pouca RAM) e o sistema serve só 2–3 usuários simultâneos. Toda decisão considera isso.

| Camada | Tecnologia |
|---|---|
| Frontend | **Next.js 14+ (App Router)** + TypeScript |
| UI | **Tailwind CSS + shadcn/ui** (componentes em cima de Radix primitives) |
| Formulários | **React Hook Form + Zod** (validação e tipos) |
| Backend | **NestJS + Prisma ORM** |
| Banco | PostgreSQL |
| Autenticação | **JWT** (access token curto), guardado em cookie **httpOnly** |
| Deploy | Docker Compose: `web` (Next.js) + `api` (Nest) + `postgres` + `nginx` como proxy reverso |

> **Sem Redis nesta fase.** Com 2–3 usuários simultâneos o Postgres não sente carga nenhuma que justifique cache. Reavaliar na Fase 3 (SaaS multi-escola com tráfego real — ver seção 11).

**Estrutura recomendada (monorepo pnpm):**
```
apps/
  web/            → Next.js (frontend)
  api/            → NestJS (backend)
packages/
  contracts/      → schemas Zod compartilhados entre web e api (DTOs, enums, tipos)
```
Isso evita duplicar validação: o mesmo schema Zod valida o formulário no frontend (via `zodResolver`) e o payload no backend (via pipe do NestJS). Se isso for complexidade demais para começar, a alternativa mais simples é duplicar os schemas em cada app e manter sincronizados manualmente (ver seção 13).

**Convenções obrigatórias:**
- **Dinheiro sempre em centavos** (`Int` no Prisma/Postgres, `number` inteiro no TypeScript). Nunca `float`/`Decimal` em coluna de valor.
- Formatador único no frontend: `brl(cents: number)` usando `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Timezone: `America/Sao_Paulo`. Datas de negócio como `Date` (só a parte de data); timestamps completos onde fizer sentido (`createdAt`, `paidAt`).
- Nomes de modelos/campos/endpoints em **inglês**, `camelCase` (Prisma) / `kebab-case` nas rotas; textos da UI em **pt-BR**. Glossário na seção 12.
- Validação de entrada com **Zod** em ambas as pontas (`nestjs-zod` ou pipe customizado no Nest; `zodResolver` no `React Hook Form`). Nunca expor o model do Prisma direto na resposta — sempre passar por um schema de saída.
- Paginação em toda listagem (`skip`/`take` do Prisma + `page`/`pageSize` na API).

**Ajustes para VPS fraca:**
- `DATABASE_URL` do Prisma com `connection_limit=5` (pool pequeno).
- `next.config.js` com `output: 'standalone'` — imagem Docker final bem menor (só o necessário pra rodar, sem a árvore de `node_modules` inteira).
- Dockerfiles **multi-stage** (`builder` com devDependencies + `runner` só com produção) pros dois apps, base `node:20-alpine`.
- `--max-old-space-size` ajustado por serviço (algo como 256–384MB cada, sobrando espaço pro Postgres).
- Sem Redis, sem filas, sem Elasticsearch — busca via Postgres (`ILIKE` + índice; full-text só se precisar).
- **Nginx como único ponto de entrada**: HTTPS + roteamento `/api/*` → Nest, tudo o resto → Next.js. Mesma origem para os dois = **zero CORS** e o cookie httpOnly do JWT funciona nos dois sem configuração extra.

> Nota honesta sobre memória: dois processos Node (Next.js + Nest) tendem a somar um pouco mais de RAM em repouso do que uma única JVM Spring Boot tunada. Na prática, com os ajustes acima, o total fica na faixa de 300–500MB pros dois serviços de aplicação — ainda confortável numa VPS de 2GB junto com o Postgres, mas vale monitorar no início.

---

## 3. Multi-tenancy (preparado desde o início)

- **Fase 1:** uma escola só, mas **todo model de negócio tem `schoolId` obrigatório** com relação para `School`.
- Estratégia: **shared schema com discriminador** (`schoolId`) — a mais leve para a VPS. Nada de schema-per-tenant.
- O JWT carrega `schoolId`; um **Prisma Client Extension** (ou middleware `$use`) garante que toda query já entra filtrada por `schoolId` — evita esquecer o filtro em algum service.
- Índices compostos começando por `schoolId` nas colunas mais consultadas.
- Cadastro self-service de novas escolas fica para a Fase 3; até lá, escola é criada via seed.

---

## 4. Perfis de acesso

| Role | Pode |
|---|---|
| `ADMIN` | Tudo: financeiro completo, metas, relatórios, usuários, configurações |
| `STAFF` (secretaria) | Alunos, turmas, matrículas, marcar mensalidade como paga, despesas. **Não vê** receita líquida, projeções e metas |

MVP com esses dois. No NestJS: `JwtAuthGuard` (autenticado) + `RolesGuard` com decorator `@Roles('ADMIN')` nos endpoints sensíveis. No frontend, esconder/desabilitar os itens correspondentes com base na role decodificada do usuário logado (a UI escondida é só conforto — a garantia real é sempre o guard no backend).

---

## 5. Modelo de domínio

Convenção Prisma: models em `PascalCase`, campos em `camelCase`. Onde fizer sentido, usar `@@map("nome_snake_case")` pra manter os nomes de tabela legíveis direto no Postgres.

### School
`id, name, cnpj?, phone, address, monthlyCapacityNote?, createdAt`

### AppUser
`id, schoolId, name, email (unique por escola), passwordHash, role (ADMIN|STAFF), active`

### Classroom (turma)
`id, schoolId, name, ageGroup (INTEGRAL_1, INTEGRAL_2, INTEGRAL_3, MATERNAL_1, MATERNAL_2, PRE_1, PRE_2, ANO_1, ANO_2, ANO_3, ANO_4, ANO_5), shift (MORNING, AFTERNOON, FULL_DAY), capacity (Int), active`
- Taxa de ocupação da turma = matrículas ativas / capacity.

### Student (aluno)
`id, schoolId, fullName, birthDate, status (ACTIVE, INACTIVE, WAITLIST), enrollmentType (FULL_TIME, HALF_DAY_MORNING, HALF_DAY_AFTERNOON), mealsIncluded (Boolean — default true se FULL_TIME), allergies (String?), dietaryRestrictions (String?), medicalNotes (String?), photoUrl?, notes, createdAt`

### Guardian (responsável)
`id, schoolId, studentId, fullName, relationship (MAE, PAI, AVO, TIO, OUTRO), cpf?, phoneWhatsapp, email?, isFinancialResponsible (Boolean), authorizedPickup (Boolean)`
- Um aluno tem 1+ responsáveis; exatamente um `isFinancialResponsible = true`.
- `authorizedPickup` cobre a nuance de "quem pode buscar a criança".

### Enrollment (matrícula)
`id, schoolId, studentId, classroomId, startDate, endDate?, status (ACTIVE, ENDED, CANCELLED), monthlyFeeCents (Int), discountCents (Int), discountReason (SIBLING, SCHOLARSHIP, NEGOTIATED, NONE), dueDay (Int, 1–28), enrollmentFeeCents (Int), notes`
- Valor efetivo da mensalidade = `monthlyFeeCents - discountCents`.
- `dueDay` limitado a 28 para evitar problema com fevereiro.
- Rematrícula anual = nova `Enrollment` (histórico preservado, permite reajuste de valor).

### TuitionInvoice (mensalidade)
`id, schoolId, enrollmentId, competence (Date, sempre dia 1 do mês de referência), amountCents (Int), discountCents (Int), dueDate, status (PENDING, PAID, OVERDUE, EXEMPT, CANCELLED), paidAt?, paymentMethod (PIX, CASH, TRANSFER)?, receiptNote (String? — ex.: "comprovante no WhatsApp 12/03"), createdAt`
- **`@@unique([schoolId, enrollmentId, competence])`** — garante idempotência da geração automática.

### ExpenseCategory
`id, schoolId, name, colorHex?` — seed inicial: Salários, Alimentação, Aluguel, Material pedagógico, Limpeza e manutenção, Contas (água/luz/internet), Impostos e taxas, Outros.

### Expense (despesa)
`id, schoolId, categoryId, description, amountCents (Int), expenseDate, supplier?, recurring (Boolean), notes`

### Goal (meta)
`id, schoolId, month (Date, dia 1), newStudentsTarget (Int), revenueTargetCents?`

### WaitlistEntry (lista de espera)
`id, schoolId, childName, birthDate, guardianName, phoneWhatsapp, desiredAgeGroup, desiredShift, requestedAt, status (WAITING, CONTACTED, ENROLLED, GAVE_UP), notes`
- Ao matricular, converte em `Student` + `Enrollment`.

### Fase 2+ (só modelar quando chegar lá)
`Attendance` (presença diária), `DailyLog` (agenda/diário para os pais), `StaffMember` (funcionários e folha).

---

## 6. Regras de negócio

### Geração automática de mensalidades
- `@Cron('0 5 1 * *', { timeZone: 'America/Sao_Paulo' })` do pacote `@nestjs/schedule` — todo dia 1º às 05:00.
- Para cada `Enrollment` ACTIVE: cria `TuitionInvoice` da competência do mês com `amountCents`/`discountCents` da matrícula e `dueDate = competência + dueDay`.
- Idempotente via `@@unique`: usar `createMany({ skipDuplicates: true })` ou `upsert`, capturando o erro `P2002` do Prisma se precisar de lógica extra. Rodar o job duas vezes não pode duplicar cobrança.
- Endpoint manual `POST /invoices/generate?competence=2026-08` (ADMIN) para reprocessar/gerar sob demanda.

### Atraso e inadimplência
- Job diário: `PENDING` com `due_date < hoje` → `OVERDUE`.
- **Aluno inadimplente** = tem ≥ 1 invoice `OVERDUE`. Badge no perfil e na listagem.
- Tela de inadimplência lista responsável financeiro com **link `wa.me/55<phone>?text=<mensagem pré-preenchida>`** para cobrar direto pelo WhatsApp (mensagem configurável com placeholders `{nome}`, `{mes}`, `{valor}`).

### Marcar como pago (fluxo mais usado do sistema — tem que ser 1 clique)
- Na listagem do mês, botão "Marcar pago" abre confirmação inline: método (default PIX), data (default hoje), campo opcional de observação do comprovante. Confirmar → `PAID`.
- Permitir desfazer (`PAID` → `PENDING`) com role ADMIN.

### Descontos
- Sugestão automática de desconto de irmãos: ao matricular 2º filho do mesmo responsável financeiro, sugerir `SIBLING` (percentual configurável, default 10%). Sempre editável.

### Ciclo anual
- Rematrícula: ação em lote "Rematricular turma para 2027" que clona matrículas ativas com novo valor (reajuste % aplicado em massa, editável por aluno) e cobra `enrollment_fee_cents` como invoice avulsa de competência janeiro.

---

## 7. Dashboard e relatórios

### Dashboard (home) — cards do mês corrente
- **Alunos ativos** e **taxa de ocupação** (ativos ÷ soma das capacidades das turmas ativas)
- **Recebido no mês** (soma `PAID` com `paid_at` no mês)
- **A receber** (`PENDING` do mês) e **em atraso** (`OVERDUE` total, R$ e % dos alunos)
- **Despesas do mês** e **resultado líquido** (recebido − despesas) — *só ADMIN*
- **Aniversariantes do mês** (lista com dia — toque essencial numa escola infantil)
- Lista de espera: quantos aguardando por faixa etária

### Gráficos (12 meses)
- Receita recebida × despesas (barras lado a lado)
- Despesas por categoria (donut do mês)
- Evolução de alunos ativos (linha)
- Meta de novos alunos × realizado (barras)

### Projeção (só ADMIN)
- Receita projetada dos próximos 3–6 meses = soma das mensalidades das matrículas ativas × (1 − taxa de inadimplência média dos últimos 6 meses).
- Cenário simples, sem ML — deixar a fórmula explícita na tela.

### Relatórios
- Inadimplência (por aluno, com total devido e link WhatsApp)
- DRE simplificado mensal: receita recebida − despesas por categoria = resultado
- Exportar CSV das listagens (gerado no frontend, sem carga no servidor)

---

## 8. API (principais endpoints)

```
POST   /auth/login
GET    /dashboard/summary?month=2026-07
GET    /dashboard/charts

GET    /students?status=&classroomId=&q=&page=
POST   /students            (aceita responsáveis aninhados)
GET    /students/{id}       (perfil completo: responsáveis, matrícula, invoices)
PUT    /students/{id}
PATCH  /students/{id}/status

GET/POST/PUT /classrooms
GET/POST     /enrollments   PATCH /enrollments/{id}/end
POST   /enrollments/renew-batch   (rematrícula em lote)

GET    /invoices?competence=2026-07&status=&page=
POST   /invoices/generate?competence=
PATCH  /invoices/{id}/pay        {method, paidAt, receiptNote}
PATCH  /invoices/{id}/revert     (ADMIN)
PATCH  /invoices/{id}/exempt     (ADMIN)

GET/POST/PUT/DELETE /expenses    GET/POST /expense-categories
GET/POST/PUT /goals
GET/POST/PATCH /waitlist
GET    /reports/defaulters       GET /reports/dre?month=
```

---

## 9. Frontend (Next.js + Tailwind + shadcn/ui + React Hook Form/Zod)

### Estrutura (App Router)
```
app/
  (auth)/login/page.tsx
  (dashboard)/
    layout.tsx              → shell: sidebar (desktop) + topbar/bottom-tabbar/drawer (mobile)
    page.tsx                 → Painel
    alunos/page.tsx
    alunos/[id]/page.tsx      → ficha do aluno (ou @modal com intercepting route)
    mensalidades/page.tsx
    turmas/page.tsx
    despesas/page.tsx
    relatorios/page.tsx
    metas/page.tsx
    configuracoes/page.tsx
middleware.ts                 → checa presença do cookie JWT e redireciona pra /login
```
- **Server Components** pra carga inicial de dados (fetch direto no servidor, encaminhando o cookie httpOnly pra API do Nest).
- **Client Components** pros formulários e ações (marcar pago, filtros, abas, accordion) — é onde `React Hook Form` entra.
- `middleware.ts` só confere se o cookie existe (redirecionamento leve); a validação de verdade do JWT acontece a cada chamada à API, nos guards do Nest.

### Formulários
- Todo formulário usa `React Hook Form` + `zodResolver`, com o schema Zod vindo de `packages/contracts` (ou duplicado — ver seção 13).
- Padrão: `Novo aluno`, `Nova turma`, `Nova despesa`, `Editar meta`, confirmação de `Marcar pago`, formulários de `Configurações`.

### Componentes shadcn/ui → onde usar
| Componente shadcn | Uso no produto |
|---|---|
| `Sheet` | Drawer do menu mobile e os bottom-sheets (nova despesa, marcar pago, editar meta) |
| `Tabs` | Segmentado Inadimplência/DRE nos Relatórios; abas da ficha do aluno |
| `Accordion` | Cards de turma expandindo a lista de alunos |
| `Switch` | Toggles de Configurações (desconto automático, refeição padrão, usuário ativo) |
| `Badge` (com variantes via `cva`) | Status de mensalidade (pago/pendente/atrasado), tipo de matrícula, papel do usuário |
| `Dialog` | Confirmações que bloqueiam a tela (ex.: desfazer pagamento) |
| `Card`, `Button`, `Input`, `Select`, `Textarea` | Base de tudo |

### Direção visual — "caderno escolar brasileiro" (mantida)
Identidade própria, não template de dashboard. Referência: material de papelaria escolar — caderno pautado, lápis, carimbo — tratado com sobriedade de painel administrativo.

**Tokens mapeados pras CSS variables do shadcn (`app/globals.css`):**
```css
:root{
  --background: 44 45% 97%;      /* --paper  #FBFAF6 */
  --foreground: 205 25% 17%;     /* --ink    #23303B */
  --primary: 221 62% 39%;        /* --pen-blue    #2B4C9B */
  --primary-foreground: 0 0% 100%;
  --accent: 38 87% 58%;          /* --pencil-yellow #F2B33D */
  --destructive: 4 68% 57%;      /* --margin-red  #D9534F */
  --muted: 40 30% 93%;           /* --paper-alt   #F3F0E8 */
  --muted-foreground: 204 14% 42%; /* --ink-soft  #5B6B78 */
  --border: 205 40% 91%;         /* --rule-line   #DDE6EF */
  /* --leaf-green (#3E7C59) não tem slot padrão no shadcn: extender o tema
     como cor customizada `success` no tailwind.config.ts */
}
```
- Extender `tailwind.config.ts` com `colors.success` (`--leaf-green`) pra badge de "Pago" e resultado positivo.
- Fontes via `next/font/google`: **Baloo 2** (títulos/números grandes dos cards), **Atkinson Hyperlegible** (corpo/UI), **IBM Plex Mono** (valores monetários e datas — `font-variant-numeric: tabular-nums`).
- Assinatura visual mantida: margem de caderno (borda esquerda colorida + leve gradiente) nos cards de destaque; status `PAGO` como carimbo (`rotate(-3deg)`, borda dupla, fonte mono).
- Mobile-first: sidebar (desktop, `md:` pra cima) some no mobile e dá lugar a topbar + bottom tab bar (`Sheet` como drawer) + FAB nas listagens que precisam de "novo item".
- Gráficos: **Recharts** (leve, mesma escolha da versão anterior do spec).

---

## 10. Prisma (schema, migrations, seed)

- Um único `prisma/schema.prisma`, organizado por bloco de model na mesma ordem da seção 5.
- Migrações via `npx prisma migrate dev` (desenvolvimento) e `npx prisma migrate deploy` (produção, roda no `docker-compose` como um passo do container `api` antes de subir o Nest).
- Seed em `prisma/seed.ts` (escola exemplo + usuário admin + categorias de despesa + dados fake pra desenvolvimento), executado via `npx prisma db seed`.
- Client gerado (`@prisma/client`) é importado só dentro do NestJS — o Next.js nunca fala com o banco direto, sempre via API.

---

## 11. Fases de entrega

**Fase 1 — MVP:** scaffold do monorepo (`apps/web`, `apps/api`, `packages/contracts`), auth/JWT, alunos + responsáveis, turmas, matrículas, mensalidades (geração automática + marcar pago), despesas + categorias, dashboard com cards.

**Fase 2:** relatórios (inadimplência + WhatsApp, DRE), gráficos 12m, metas e projeção, lista de espera, rematrícula em lote, export CSV.

**Fase 3 (SaaS):** cadastro self-service de escolas, presença diária, agenda/diário para pais, funcionários/folha, **Redis (Cache Aside) reentra aqui** quando houver tráfego concorrente real de múltiplas escolas.

---

## 12. Glossário código ⇄ UI

| Código | UI (pt-BR) |
|---|---|
| `Student` | Aluno |
| `Guardian` | Responsável |
| `Classroom` | Turma |
| `Enrollment` | Matrícula |
| `TuitionInvoice` | Mensalidade |
| `competence` | Competência (mês de referência) |
| `OVERDUE` | Atrasada / Inadimplente |
| `EXEMPT` | Isenta |
| `WaitlistEntry` | Lista de espera |
| `FULL_TIME` | Integral |
| `HALF_DAY_MORNING/AFTERNOON` | Meio período (manhã/tarde) |

---

## 13. Assunções (ajustar se necessário)

1. Multa/juros por atraso **não** são calculados automaticamente no MVP (a escola negocia caso a caso — o campo `receiptNote` cobre isso). Se quiser, adicionar depois `lateFeeCents`.
2. Refeição inclusa não gera cobrança extra no MVP — é atributo informativo; alunos de meio período com refeição avulsa entram como ajuste no `monthlyFeeCents`.
3. Um responsável financeiro por aluno; irmãos são detectados pelo telefone/CPF do responsável financeiro.
4. Redis fica de fora do MVP: 2–3 usuários simultâneos não geram carga que justifique cache. Volta a fazer sentido na Fase 3 (SaaS multi-escola).
5. JWT fica num cookie **httpOnly** setado pelo Nest; o `middleware.ts` do Next.js só confere se o cookie existe pra decidir se redireciona pra `/login` — a validação de verdade do token acontece a cada chamada aos guards da API. Nginx roteando `web` e `api` na mesma origem evita ter que lidar com CORS.
6. Os schemas Zod ficam num pacote compartilhado (`packages/contracts`) num monorepo pnpm, usados tanto pelo `React Hook Form` no frontend quanto pela validação de entrada no Nest. Se o setup do monorepo for atrito demais pra começar, a alternativa é duplicar os schemas nos dois apps — funciona, só exige lembrar de manter os dois sincronizados quando uma regra de validação mudar.
7. Frontend (Next.js) nunca acessa o Postgres direto — todo dado passa pela API do Nest, inclusive nos Server Components (fetch server-to-server encaminhando o cookie).
