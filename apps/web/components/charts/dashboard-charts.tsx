'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { brl, formatCompetence } from '@/lib/format';

/* Cores por variável CSS: acompanham o tema claro/escuro automaticamente */
const COLORS = {
  primary: 'hsl(var(--primary))',
  destructive: 'hsl(var(--destructive))',
  success: 'hsl(var(--success))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted-foreground))',
};

const GRID_STROKE = 'hsl(var(--border))';
const TICK_STYLE = { fontSize: 12, fill: 'hsl(var(--muted-foreground))' };
const TICK_STYLE_SM = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };
const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
};

const monthLabel = (competence: string) => formatCompetence(competence).split(' de ')[0].slice(0, 3);

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.dataKey !== 'activeCount' ? brl(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export function RevenueVsExpensesChart({
  data,
}: {
  data: { competence: string; receivedCents: number; expensesCents: number }[];
}) {
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.competence) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="label" tick={TICK_STYLE} />
        <YAxis tickFormatter={(v) => brl(v).replace(/ /g, ' ')} tick={TICK_STYLE_SM} width={70} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.6)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="receivedCents" name="Recebido" fill={COLORS.success} radius={[4, 4, 0, 0]} />
        <Bar dataKey="expensesCents" name="Despesas" fill={COLORS.destructive} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExpensesByCategoryChart({
  data,
}: {
  data: { name: string; colorHex: string; totalCents: number }[];
}) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Sem despesas neste mês.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="totalCents" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.colorHex} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => brl(value)} contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ActiveStudentsChart({ data }: { data: { competence: string; activeCount: number }[] }) {
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.competence) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="label" tick={TICK_STYLE} />
        <YAxis allowDecimals={false} tick={TICK_STYLE_SM} width={30} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.6)" }} />
        <Line
          type="monotone"
          dataKey="activeCount"
          name="Alunos ativos"
          stroke={COLORS.primary}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PaymentStatusDonut({
  paid,
  pending,
  overdue,
}: {
  paid: number;
  pending: number;
  overdue: number;
}) {
  const total = paid + pending + overdue;
  const data = [
    { name: 'Pagos', value: paid, color: COLORS.success },
    { name: 'Pendentes', value: pending, color: COLORS.accent },
    { name: 'Em atraso', value: overdue, color: COLORS.destructive },
  ];

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Sem mensalidades neste mês.</p>;
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={3} startAngle={90} endAngle={-270}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} (${Math.round((value / total) * 100)}%)`, name]}
            contentStyle={TOOLTIP_STYLE}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 top-0 grid place-content-center text-center" style={{ bottom: 0 }}>
        <p className="font-display text-2xl font-bold">{total}</p>
        <p className="text-[11px] text-muted-foreground">mensalidades</p>
      </div>
    </div>
  );
}

export function DefaultRateChart({
  data,
}: {
  data?: { competence: string; rate: number | null; overdueCount: number; totalCount: number }[];
}) {
  // `data` pode vir undefined enquanto a API ainda não expõe defaultRateEvolution (deploy/restart pendente)
  const chartData = (data ?? []).map((d) => ({
    ...d,
    label: monthLabel(d.competence),
    ratePct: d.rate === null ? null : Math.round(d.rate * 1000) / 10,
  }));
  const hasData = chartData.some((d) => d.ratePct !== null);
  if (!hasData) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Sem mensalidades no período.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="label" tick={TICK_STYLE} />
        <YAxis tickFormatter={(v) => `${v}%`} tick={TICK_STYLE_SM} width={40} domain={[0, 'auto']} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number, _name: string, item: any) => [
            `${value}% (${item.payload.overdueCount} de ${item.payload.totalCount})`,
            'Inadimplência',
          ]}
        />
        <Line
          type="monotone"
          dataKey="ratePct"
          name="Inadimplência"
          stroke={COLORS.destructive}
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GoalVsActualChart({
  data,
}: {
  data: { competence: string; target: number | null; actual: number }[];
}) {
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.competence), target: d.target ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
        <XAxis dataKey="label" tick={TICK_STYLE} />
        <YAxis allowDecimals={false} tick={TICK_STYLE_SM} width={30} />
        <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'hsl(var(--muted) / 0.6)' }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="target" name="Meta" fill={COLORS.muted} radius={[4, 4, 0, 0]} />
        <Bar dataKey="actual" name="Realizado" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
