import Link from 'next/link';
import { ArrowRight, Cake, Hourglass, TrendingUp } from 'lucide-react';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { brl, currentCompetence, formatCompetence } from '@/lib/format';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  RevenueVsExpensesChart,
  ExpensesByCategoryChart,
  ActiveStudentsChart,
  GoalVsActualChart,
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

  return (
    <div className="space-y-7">
      <div className="paper-panel overflow-hidden">
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-end md:p-6">
          <div>
            <p className="page-kicker">Visão geral</p>
            <h1 className="page-title mt-1">Painel da secretaria</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {formatCompetence(summary.competence)} · acompanhamento financeiro, ocupação e rotinas prioritárias.
            </p>
          </div>
          <div className="grid gap-2 text-center min-[420px]:grid-cols-3 sm:min-w-[360px]">
            <div className="rounded-md border bg-muted/55 px-3 py-3">
              <p className="money text-lg font-bold">{pct(summary.occupancyRate)}</p>
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Ocupação</p>
            </div>
            <div className="rounded-md border bg-success/10 px-3 py-3">
              <p className="money text-lg font-bold text-success">{brl(summary.receivedCents)}</p>
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Recebido</p>
            </div>
            <div className="rounded-md border bg-destructive/10 px-3 py-3">
              <p className="money text-lg font-bold text-destructive">{summary.overdueStudents}</p>
              <p className="text-[11px] font-bold uppercase text-muted-foreground">Em atraso</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Alunos ativos"
          value={String(summary.activeStudents)}
          hint={`Ocupação ${pct(summary.occupancyRate)} de ${summary.capacity} vagas`}
          compact
        />
        <StatCard
          label="Recebido no mês"
          value={brl(summary.receivedCents)}
          hint={`${summary.receivedCount} mensalidades pagas`}
          accent="success"
          money
          compact
        />
        <StatCard
          label="A receber"
          value={brl(summary.pendingCents)}
          hint={`${summary.pendingCount} pendentes no mês`}
          accent="accent"
          money
          compact
        />
        <StatCard
          label="Em atraso"
          value={brl(summary.overdueCents)}
          hint={`${summary.overdueStudents} aluno(s) inadimplente(s) — ${pct(summary.overdueStudentsRate)}`}
          accent="destructive"
          money
          compact
        />
        <StatCard label="Despesas do mês" value={brl(summary.expensesCents)} accent="destructive" money compact />
        {user.role === 'ADMIN' && summary.netCents !== null && (
          <StatCard
            label="Resultado líquido"
            value={brl(summary.netCents)}
            hint="Recebido − despesas"
            accent={summary.netCents >= 0 ? 'success' : 'destructive'}
            money
            compact
          />
        )}
        <StatCard
          label="Lista de espera"
          value={String(summary.waitlistCount)}
          hint="Crianças aguardando vaga"
          compact
        />
        {summary.goal && (
          <StatCard
            label="Meta de novos alunos"
            value={String(summary.goal.newStudentsTarget)}
            hint="Definida para este mês"
            accent="accent"
            compact
          />
        )}
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
            <CardTitle>Atalhos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Link href="/mensalidades" className="action-link">
              Ver mensalidades do mês <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/mensalidades?status=OVERDUE" className="action-link">
              Cobrar atrasadas ({summary.overdueCount}) <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/alunos/novo" className="action-link">
              Cadastrar novo aluno <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
