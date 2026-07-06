import Link from 'next/link';
import { Cake, Hourglass } from 'lucide-react';
import { apiGet, getSessionUser } from '@/lib/server-api';
import { brl, currentCompetence, formatCompetence } from '@/lib/format';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export default async function PainelPage() {
  const [user, summary] = await Promise.all([
    getSessionUser(),
    apiGet<DashboardSummary>(`/dashboard/summary?month=${currentCompetence()}`),
  ]);
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel</h1>
        <p className="text-sm text-muted-foreground">{formatCompetence(summary.competence)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Alunos ativos"
          value={String(summary.activeStudents)}
          hint={`Ocupação ${pct(summary.occupancyRate)} de ${summary.capacity} vagas`}
        />
        <StatCard
          label="Recebido no mês"
          value={brl(summary.receivedCents)}
          hint={`${summary.receivedCount} mensalidades pagas`}
          accent="success"
          money
        />
        <StatCard
          label="A receber"
          value={brl(summary.pendingCents)}
          hint={`${summary.pendingCount} pendentes no mês`}
          accent="accent"
          money
        />
        <StatCard
          label="Em atraso"
          value={brl(summary.overdueCents)}
          hint={`${summary.overdueStudents} aluno(s) inadimplente(s) — ${pct(summary.overdueStudentsRate)}`}
          accent="destructive"
          money
        />
        <StatCard label="Despesas do mês" value={brl(summary.expensesCents)} accent="destructive" money />
        {user.role === 'ADMIN' && summary.netCents !== null && (
          <StatCard
            label="Resultado líquido"
            value={brl(summary.netCents)}
            hint="Recebido − despesas"
            accent={summary.netCents >= 0 ? 'success' : 'destructive'}
            money
          />
        )}
        <StatCard
          label="Lista de espera"
          value={String(summary.waitlistCount)}
          hint="Crianças aguardando vaga"
        />
        {summary.goal && (
          <StatCard
            label="Meta de novos alunos"
            value={String(summary.goal.newStudentsTarget)}
            hint="Definida para este mês"
            accent="accent"
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="notebook-card" style={{ ['--notebook-accent' as string]: 'var(--accent)' }}>
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

        <Card className="notebook-card">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Hourglass className="h-5 w-5 text-primary" />
            <CardTitle>Atalhos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Link href="/mensalidades" className="rounded-md border px-3 py-2 font-semibold hover:bg-muted">
              Ver mensalidades do mês →
            </Link>
            <Link href="/mensalidades?status=OVERDUE" className="rounded-md border px-3 py-2 font-semibold hover:bg-muted">
              Cobrar atrasadas ({summary.overdueCount}) →
            </Link>
            <Link href="/alunos/novo" className="rounded-md border px-3 py-2 font-semibold hover:bg-muted">
              Cadastrar novo aluno →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
