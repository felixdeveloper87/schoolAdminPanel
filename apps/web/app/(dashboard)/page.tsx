import Link from 'next/link';
import {
  ArrowRight,
  Cake,
  Hourglass,
  TrendingUp,
  TrendingDown,
  UserPlus,
  CheckCircle2,
  Wallet,
  FileBarChart,
  AlertTriangle,
  Users,
  Clock,
  Target,
  Bell,
  CalendarDays,
  Plus,
  Search,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { brl, currentCompetence, formatCompetence } from '@/lib/format';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  RevenueVsExpensesChart,
  ExpensesByCategoryChart,
  ActiveStudentsChart,
  GoalVsActualChart,
  PaymentStatusDonut,
} from '@/components/charts/dashboard-charts';

interface DashboardSummary {
  competence: string;
  activeStudents: number;
  capacity: number;
  occupancyRate: number;
  receivedCents: number;
  receivedCount: number;
  pendingCents: number;
  pendingCount: number;
  overdueCents: number;
  overdueCount: number;
  overdueStudents: number;
  overdueStudentsRate: number;
  expensesCents: number;
  netCents: number | null;
  birthdays: { id: string; fullName: string; day: number }[];
  waitlistCount: number;
  goal: { newStudentsTarget: number; revenueTargetCents: number | null } | null;
}

interface DashboardCharts {
  revenueVsExpenses: { competence: string; receivedCents: number; expensesCents: number }[];
  activeStudentsEvolution: { competence: string; activeCount: number }[];
  goalVsActual: { competence: string; target: number | null; actual: number }[];
  expensesByCategory: { name: string; colorHex: string; totalCents: number }[];
}

interface DashboardProjection {
  avgDefaultRate: number;
  monthlyRevenueCents: number;
  months: { competence: string; projectedCents: number }[];
}

export default async function PainelPage() {
  const month = currentCompetence();
  const [user, summary, charts] = await Promise.all([
    getSessionUser(),
    apiGet<DashboardSummary>(`/dashboard/summary?month=${month}`),
    apiGet<DashboardCharts>(`/dashboard/charts?month=${month}`),
  ]);
  const projection =
    user.role === 'ADMIN' ? await apiGet<DashboardProjection>(`/dashboard/projection?month=${month}`) : null;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const growthPct = (previous: number | null, current: number) =>
    previous && previous > 0 ? `${current >= previous ? '+' : ''}${Math.round(((current - previous) / previous) * 100)}%` : null;

  const activeEvolution = charts.activeStudentsEvolution;
  const prevActive = activeEvolution.length >= 2 ? activeEvolution[activeEvolution.length - 2].activeCount : null;
  const activeGrowth = growthPct(prevActive, summary.activeStudents);
  const activeSparkline = activeEvolution.slice(-6).map((m) => m.activeCount);

  const revenueEvolution = charts.revenueVsExpenses;
  const prevReceived = revenueEvolution.length >= 2 ? revenueEvolution[revenueEvolution.length - 2].receivedCents : null;
  const receivedGrowth = growthPct(prevReceived, summary.receivedCents);
  const prevExpenses = revenueEvolution.length >= 2 ? revenueEvolution[revenueEvolution.length - 2].expensesCents : null;
  const expensesGrowth = growthPct(prevExpenses, summary.expensesCents);

  const netPositive = summary.netCents !== null && summary.netCents >= 0;
  const occScore = Math.min(summary.occupancyRate, 1) * 35;
  const defaultScore = (1 - Math.min(summary.overdueStudentsRate, 1)) * 45;
  const netScore = summary.netCents === null ? 11 : netPositive ? 20 : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(occScore + defaultScore + netScore)));
  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const competenceLabel = formatCompetence(summary.competence).replace(' de ', ' ');

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6857ef]">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold leading-none tracking-tight text-[#0d1729] sm:text-[34px]">
            Bom dia, {firstName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-2 text-sm text-[#657189]">Resumo financeiro e operacional da escola em um só lugar.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <form action="/alunos" className="relative min-w-[220px] flex-1 sm:w-[300px] sm:flex-none">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d98ae]" />
            <input
              name="q"
              type="search"
              placeholder="Pesquisar..."
              aria-label="Pesquisar alunos"
              className="h-11 w-full rounded-2xl border border-white/80 bg-white/90 pl-11 pr-4 text-sm text-foreground shadow-[0_8px_25px_rgba(44,55,91,.06)] outline-none placeholder:text-[#9ba5ba] focus:border-[#7968f2]/40 focus:ring-4 focus:ring-[#7968f2]/10"
            />
          </form>
          <Link
            href="/mensalidades?status=OVERDUE"
            aria-label="Ver mensalidades atrasadas"
            className="relative grid h-11 w-11 place-items-center rounded-2xl border border-white/80 bg-white/90 text-[#5d687d] shadow-[0_8px_25px_rgba(44,55,91,.06)] transition-colors hover:text-[#6857ef]"
          >
            <Bell className="h-4 w-4" />
            {summary.overdueCount > 0 && <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#f25f72]" />}
          </Link>
          <div className="flex h-11 items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 text-xs font-bold text-[#172033] shadow-[0_8px_25px_rgba(44,55,91,.06)]">
            <CalendarDays className="h-4 w-4 text-[#7564ef]" />
            {competenceLabel}
          </div>
          <Link
            href="/mensalidades"
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-[#6554e8] to-[#806bf5] px-5 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(101,84,232,.28)] transition-transform hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Nova mensalidade
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="relative grid min-h-[282px] gap-6 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#5146d7] via-[#6854e5] to-[#8b6cf0] p-7 text-white shadow-[0_18px_45px_rgba(83,70,206,.18)] xl:grid-cols-[1.65fr_.85fr] xl:items-stretch">
        <span className="pointer-events-none absolute -right-24 -top-52 h-[430px] w-[430px] rounded-full border-[54px] border-white/[0.035]" />
        <span className="pointer-events-none absolute -bottom-36 right-40 h-80 w-80 rounded-full bg-white/[0.025]" />
        <div className="relative z-10 flex flex-col justify-center">
          <span className="inline-flex h-[30px] w-fit self-start items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 text-[10px] font-extrabold uppercase tracking-[0.02em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)]">
            <span aria-hidden="true" className="flex h-3 items-end gap-[2px] text-white/65">
              <span className="h-[5px] w-px rounded-full bg-current" />
              <span className="h-[9px] w-px rounded-full bg-current" />
              <span className="h-[7px] w-px rounded-full bg-current" />
              <span className="h-[11px] w-px rounded-full bg-current" />
            </span>
            Resumo inteligente
          </span>
          <h2 className="mt-4 max-w-3xl font-display text-[27px] font-extrabold leading-[1.18] sm:text-[31px]">
            {summary.overdueStudents > 0
              ? 'A escola está saudável, mas a inadimplência exige atenção neste mês.'
              : 'A escola está com as finanças em dia neste mês.'}
          </h2>
          <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-white/80">
            {summary.netCents !== null && (
              <>
                O resultado líquido {netPositive ? 'permanece positivo' : 'está negativo'} em{' '}
                <strong>{brl(summary.netCents)}</strong>.{' '}
              </>
            )}
            Há {summary.overdueStudents} aluno(s) com mensalidades vencidas, enquanto a ocupação chegou a{' '}
            {pct(summary.occupancyRate)}.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/relatorios" className={buttonVariants({ className: 'h-11 rounded-xl bg-white px-5 text-[#29226f] hover:bg-white/90' })}>
              Ver relatório completo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/mensalidades?status=OVERDUE"
              className={buttonVariants({
                variant: 'outline',
                className: 'h-11 rounded-xl border-white/25 bg-white/10 px-5 text-white shadow-none hover:bg-white/20 hover:text-white',
              })}
            >
              Cobrar mensalidades
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-center rounded-[24px] border border-white/20 bg-white/[0.11] p-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] text-white/80">Saúde da escola</p>
              <p className="mt-2 font-display text-5xl font-extrabold leading-none">
                {healthScore}
                <small className="ml-0.5 text-sm font-bold text-white/65">/100</small>
              </p>
            </div>
            <span className="rounded-full bg-[#6a63d8] px-3 py-1.5 text-[10px] font-bold text-[#dcd9ff]">Atualizado</span>
          </div>
          <svg viewBox="0 0 220 108" className="mt-1 h-[92px] w-full" aria-hidden="true">
            <circle
              cx="110"
              cy="98"
              r="72"
              pathLength="100"
              fill="none"
              stroke="rgba(255,255,255,.20)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray="50 50"
              transform="rotate(180 110 98)"
            />
            <circle
              cx="110"
              cy="98"
              r="72"
              pathLength="100"
              fill="none"
              stroke="white"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${healthScore / 2} 100`}
              transform="rotate(180 110 98)"
            />
          </svg>
          <p className="text-[10px] text-white/65">Baseado em ocupação, caixa e inadimplência.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Alunos ativos"
          value={String(summary.activeStudents)}
          hint="em relação ao mês passado"
          trend={activeGrowth ? { direction: activeGrowth.startsWith('-') ? 'down' : 'up', value: activeGrowth } : undefined}
          icon={Users}
          sparkline={activeSparkline.length >= 2 ? activeSparkline : undefined}
          accent="primary"
          compact
        />
        <StatCard
          label="Recebido no mês"
          value={brl(summary.receivedCents)}
          hint={receivedGrowth ? 'sobre o mês anterior' : `${summary.receivedCount} mensalidades pagas`}
          trend={receivedGrowth ? { direction: receivedGrowth.startsWith('-') ? 'down' : 'up', value: receivedGrowth } : undefined}
          icon={Wallet}
          accent="success"
          money
          compact
        />
        <StatCard
          label="A receber"
          value={brl(summary.pendingCents)}
          hint={`${summary.pendingCount} pagamentos ainda pendentes`}
          icon={Clock}
          accent="accent"
          money
          compact
        />
        <StatCard
          label="Em atraso"
          value={brl(summary.overdueCents)}
          trend={{ direction: 'down', value: pct(summary.overdueStudentsRate) }}
          hint="dos alunos inadimplentes"
          icon={AlertTriangle}
          accent="destructive"
          money
          compact
        />
        <StatCard
          label="Despesas do mês"
          value={brl(summary.expensesCents)}
          hint={expensesGrowth ? 'sobre o mês anterior' : undefined}
          trend={expensesGrowth ? { direction: expensesGrowth.startsWith('-') ? 'up' : 'down', value: expensesGrowth } : undefined}
          icon={TrendingDown}
          accent="destructive"
          money
          compact
        />
        {user.role === 'ADMIN' && summary.netCents !== null && (
          <StatCard
            label="Resultado líquido"
            value={brl(summary.netCents)}
            trend={{ direction: summary.netCents >= 0 ? 'up' : 'down', value: summary.netCents >= 0 ? 'Positivo' : 'Negativo' }}
            hint="no mês atual"
            icon={TrendingUp}
            accent={summary.netCents >= 0 ? 'success' : 'destructive'}
            money
            compact
          />
        )}
        <StatCard
          label="Lista de espera"
          value={String(summary.waitlistCount)}
          hint="Crianças aguardando vaga"
          icon={Hourglass}
          accent="violet"
          compact
        />
        {summary.goal && (
          <StatCard
            label="Meta de novos alunos"
            value={String(summary.goal.newStudentsTarget)}
            hint="Definida para este mês"
            icon={Target}
            accent="accent"
            compact
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="paper-panel">
          <CardHeader>
            <CardTitle>Receita recebida × despesas</CardTitle>
            <CardDescription>Últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueVsExpensesChart data={charts.revenueVsExpenses} />
          </CardContent>
        </Card>
        <Card className="paper-panel">
          <CardHeader>
            <CardTitle>Status dos pagamentos</CardTitle>
            <CardDescription>{formatCompetence(summary.competence)}</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentStatusDonut paid={summary.receivedCount} pending={summary.pendingCount} overdue={summary.overdueCount} />
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Pagos
                </span>
                <strong>{summary.receivedCount}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  Pendentes
                </span>
                <strong>{summary.pendingCount}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  Em atraso
                </span>
                <strong>{summary.overdueCount}</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="notebook-card paper-panel" style={{ ['--notebook-accent' as string]: 'var(--accent)' }}>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Cake className="h-5 w-5 text-accent" />
            <CardTitle>Aniversariantes do mês</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.birthdays.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum aniversariante este mês.</p>
            ) : (
              <ul className="divide-y">
                {summary.birthdays.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/alunos/${b.id}`} className="font-semibold hover:text-primary">
                      {b.fullName}
                    </Link>
                    <span className="money text-muted-foreground">dia {String(b.day).padStart(2, '0')}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="notebook-card paper-panel">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Hourglass className="h-5 w-5 text-primary" />
            <CardTitle>Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/alunos/novo"
                className="rounded-md border bg-muted/40 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-sm"
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
                  <UserPlus className="h-4 w-4" />
                </span>
                <p className="mt-2 text-xs font-bold">Novo aluno</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">Cadastrar uma nova matrícula</p>
              </Link>
              <Link
                href="/mensalidades"
                className="rounded-md border bg-muted/40 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-sm"
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-success/10 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <p className="mt-2 text-xs font-bold">Registrar pagamento</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">Dar baixa em uma mensalidade</p>
              </Link>
              <Link
                href="/despesas"
                className="rounded-md border bg-muted/40 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-sm"
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-destructive/10 text-destructive">
                  <Wallet className="h-4 w-4" />
                </span>
                <p className="mt-2 text-xs font-bold">Nova despesa</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">Adicionar um lançamento financeiro</p>
              </Link>
              <Link
                href="/relatorios"
                className="rounded-md border bg-muted/40 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-card hover:shadow-sm"
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-accent/10 text-accent">
                  <FileBarChart className="h-4 w-4" />
                </span>
                <p className="mt-2 text-xs font-bold">Gerar relatório</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">Exportar os dados do período</p>
              </Link>
            </div>

            {(summary.overdueStudents > 0 || summary.waitlistCount > 0) && (
              <div className="mt-4 space-y-1 border-t pt-3">
                <p className="text-xs font-bold uppercase text-muted-foreground">Alertas importantes</p>
                {summary.overdueStudents > 0 && (
                  <Link
                    href="/mensalidades?status=OVERDUE"
                    className="flex items-center gap-3 rounded-md px-1 py-2 text-sm transition-colors hover:bg-destructive/5"
                  >
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {summary.overdueStudents} mensalidade(s) em atraso
                      </span>
                      <span className="block text-[11px] text-muted-foreground">Requerem acompanhamento da administração</span>
                    </span>
                  </Link>
                )}
                {summary.waitlistCount > 0 && (
                  <Link
                    href="/lista-espera"
                    className="flex items-center gap-3 rounded-md px-1 py-2 text-sm transition-colors hover:bg-accent/5"
                  >
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-accent/10 text-accent">
                      <Hourglass className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {summary.waitlistCount} criança(s) na lista de espera
                      </span>
                      <span className="block text-[11px] text-muted-foreground">Verifique disponibilidade de novas vagas</span>
                    </span>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="paper-panel">
          <CardHeader>
            <CardTitle>Despesas por categoria</CardTitle>
            <CardDescription>{formatCompetence(summary.competence)}</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpensesByCategoryChart data={charts.expensesByCategory} />
          </CardContent>
        </Card>
        <Card className="paper-panel">
          <CardHeader>
            <CardTitle>Evolução de alunos ativos</CardTitle>
            <CardDescription>Últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ActiveStudentsChart data={charts.activeStudentsEvolution} />
          </CardContent>
        </Card>
        <Card className="paper-panel">
          <CardHeader>
            <CardTitle>Meta de novos alunos × realizado</CardTitle>
            <CardDescription>Últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <GoalVsActualChart data={charts.goalVsActual} />
          </CardContent>
        </Card>
      </div>

      {projection && (
        <Card className="notebook-card paper-panel" style={{ ['--notebook-accent' as string]: 'var(--primary)' }}>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Projeção de receita (próximos 6 meses)</CardTitle>
              <CardDescription>
                Fórmula: soma das mensalidades das matrículas ativas ×
                (1 − taxa média de inadimplência dos últimos 6 meses fechados). Cenário simples, sem
                machine learning.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Mensalidades ativas somam <span className="money font-semibold text-foreground">{brl(projection.monthlyRevenueCents)}</span>/mês
              · taxa média de inadimplência: <span className="font-semibold text-foreground">{pct(projection.avgDefaultRate)}</span>
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {projection.months.map((m) => (
                <div key={m.competence} className="rounded-md border bg-muted/45 p-3 text-center">
                  <p className="text-xs text-muted-foreground">{formatCompetence(m.competence)}</p>
                  <p className="money mt-1 font-semibold">{brl(m.projectedCents)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
