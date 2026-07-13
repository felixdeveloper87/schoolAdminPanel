import {
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  Lightbulb,
  Pencil,
  Plus,
  Target,
  UserPlus,
} from 'lucide-react';
import { apiGet } from '@/lib/server-api';
import { brl, currentCompetence, formatCompetence } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GoalDialog } from '@/components/goal-dialog';
import { StatCard } from '@/components/stat-card';
import { GoalVsActualChart } from '@/components/charts/dashboard-charts';

interface GoalRow {
  id: string;
  month: string;
  newStudentsTarget: number;
  revenueTargetCents: number | null;
}

interface DashboardSummary {
  receivedCents: number;
}

interface DashboardCharts {
  goalVsActual: { competence: string; target: number | null; actual: number }[];
}

export default async function MetasPage() {
  const competence = currentCompetence();
  const [goals, summary, charts] = await Promise.all([
    apiGet<GoalRow[]>('/goals'),
    apiGet<DashboardSummary>(`/dashboard/summary?month=${competence}`),
    apiGet<DashboardCharts>(`/dashboard/charts?month=${competence}`),
  ]);
  const currentGoal = goals.find((goal) => goal.month.slice(0, 7) === competence) ?? null;
  const currentPerformance = charts.goalVsActual.find((item) => item.competence === competence);
  const newStudentsActual = currentPerformance?.actual ?? 0;
  const newStudentsTarget = currentGoal?.newStudentsTarget ?? 0;
  const newStudentsProgress = newStudentsTarget > 0 ? Math.min(100, Math.round((newStudentsActual / newStudentsTarget) * 100)) : 0;
  const studentsRemaining = Math.max(0, newStudentsTarget - newStudentsActual);
  const revenueProgress = currentGoal?.revenueTargetCents
    ? Math.min(100, Math.round((summary.receivedCents / currentGoal.revenueTargetCents) * 100))
    : 0;
  const revenueRemaining = currentGoal?.revenueTargetCents
    ? Math.max(0, currentGoal.revenueTargetCents - summary.receivedCents)
    : 0;

  const insight = !currentGoal
    ? 'Crie uma meta para este mês e passe a acompanhar o ritmo das novas matrículas e do faturamento.'
    : studentsRemaining > 0
      ? `Faltam ${studentsRemaining} nova(s) matrícula(s) para a meta do mês. Use a lista de espera como prioridade de contato.`
      : 'A meta de novas matrículas já foi atingida. Este é um bom momento para revisar a meta de faturamento.';

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-[28px] bg-[#234c46] px-5 py-6 text-white shadow-[0_18px_45px_rgba(35,76,70,.2)] sm:px-7 sm:py-7">
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#75c89b]/30 blur-2xl" />
        <div aria-hidden="true" className="absolute bottom-0 right-24 h-28 w-28 rounded-full border-[18px] border-[#b6edcf]/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#bee9cf]">Planejamento escolar</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-[34px]">Metas</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#cce5d8]">
              Defina prioridades mensais e acompanhe o impacto das matrículas e do faturamento.
            </p>
          </div>
          <GoalDialog
            trigger={
              <Button className="h-10 rounded-xl bg-card px-4 text-success shadow-[0_8px_20px_rgba(0,0,0,.16)] hover:bg-success/10 hover:text-success">
                <Plus className="h-4 w-4" /> Nova meta
              </Button>
            }
          />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Metas cadastradas"
          value={String(goals.length)}
          hint="nos últimos 24 meses"
          icon={Target}
          accent="primary"
        />
        <StatCard
          label="Meta de novos alunos"
          value={currentGoal ? String(currentGoal.newStudentsTarget) : '—'}
          hint={currentGoal ? `para ${formatCompetence(competence)}` : 'Defina a meta do mês'}
          icon={UserPlus}
          accent="success"
        />
        <StatCard
          label="Novas matrículas"
          value={String(newStudentsActual)}
          hint={currentGoal ? `${newStudentsProgress}% da meta atual` : 'realizadas neste mês'}
          icon={CircleGauge}
          accent="accent"
        />
        <StatCard
          label="Meta de faturamento"
          value={currentGoal?.revenueTargetCents ? brl(currentGoal.revenueTargetCents) : '—'}
          hint={currentGoal?.revenueTargetCents ? `${revenueProgress}% recebido até agora` : 'Opcional para cada mês'}
          icon={BadgeDollarSign}
          accent="violet"
          money={Boolean(currentGoal?.revenueTargetCents)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
          <CardHeader className="border-b border-success/20 p-5">
            <CardTitle className="text-success">Ritmo de {formatCompetence(competence)}</CardTitle>
            <CardDescription>O quanto já foi realizado das metas definidas para este mês.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-success/20 bg-success/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Novos alunos</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-success">
                    {newStudentsActual}<span className="text-base text-muted-foreground">/{newStudentsTarget || '—'}</span>
                  </p>
                </div>
                {newStudentsTarget > 0 && newStudentsProgress >= 100 && (
                  <CheckCircle2 className="h-7 w-7 text-success" />
                )}
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-success/10">
                <div className="h-full rounded-full bg-success" style={{ width: `${newStudentsProgress}%` }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                {currentGoal ? (studentsRemaining ? `Faltam ${studentsRemaining} matrícula(s)` : 'Meta atingida') : 'Sem meta cadastrada'}
              </p>
            </div>

            <div className="rounded-2xl border border-brand/20 bg-brand/10 p-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Faturamento recebido</p>
                <p className="money mt-1 font-display text-2xl font-extrabold tracking-tight text-brand">{brl(summary.receivedCents)}</p>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-brand/10">
                <div className="h-full rounded-full bg-brand" style={{ width: `${revenueProgress}%` }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                {currentGoal?.revenueTargetCents ? (revenueRemaining ? `Faltam ${brl(revenueRemaining)}` : 'Meta atingida') : 'Defina uma meta de faturamento'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[24px] border-brand/20 bg-gradient-to-br from-card to-brand/10 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(73,47,93,.08)]">
          <CardContent className="p-5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-brand">
              <Lightbulb className="h-5 w-5" />
            </span>
            <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Sugestão de foco</p>
            <h2 className="mt-1 font-display text-xl font-extrabold text-brand">Próxima melhor ação</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{insight}</p>
            <div className="mt-5 flex items-center gap-2 text-xs font-bold text-brand">
              <CalendarDays className="h-4 w-4" /> Revise este indicador semanalmente
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
        <CardHeader className="border-b border-border p-5">
          <CardTitle className="text-foreground">Meta x realizado</CardTitle>
          <CardDescription>Histórico dos últimos 12 meses para metas de novas matrículas.</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-3">
          <GoalVsActualChart data={charts.goalVsActual} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[24px] border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_14px_35px_rgba(34,45,75,.08)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-foreground">Planejamento mensal</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Crie ou revise metas para manter o plano anual em movimento.</p>
          </div>
          <span className="hidden rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success sm:inline">{goals.length} meta(s)</span>
        </div>
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead>Meta de novos alunos</TableHead>
              <TableHead>Meta de faturamento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goals.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  Nenhuma meta cadastrada ainda. Comece definindo o foco deste mês.
                </TableCell>
              </TableRow>
            )}
            {goals.map((goal) => {
              const month = goal.month.slice(0, 7);
              const isCurrent = month === competence;
              return (
                <TableRow key={goal.id} className={isCurrent ? 'bg-success/10 hover:bg-success/10' : 'hover:bg-muted/60'}>
                  <TableCell className="font-bold text-muted-foreground">
                    <span className="flex items-center gap-2">
                      {formatCompetence(month)}
                      {isCurrent && <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-extrabold text-success">Atual</span>}
                    </span>
                  </TableCell>
                  <TableCell className="money font-semibold text-muted-foreground">{goal.newStudentsTarget}</TableCell>
                  <TableCell className="money font-semibold text-muted-foreground">
                    {goal.revenueTargetCents !== null ? brl(goal.revenueTargetCents) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <GoalDialog
                      defaultMonth={month}
                      defaultTarget={goal.newStudentsTarget}
                      defaultRevenueCents={goal.revenueTargetCents}
                      trigger={
                        <Button variant="ghost" size="sm" className="rounded-lg text-muted-foreground hover:bg-success/10 hover:text-success">
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
