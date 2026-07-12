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

const COLORS = {
  primary: '#2B4C9B',
  destructive: '#D9534F',
  success: '#3E7C59',
  accent: '#F2B33D',
  muted: '#5B6B78',
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
        <CartesianGrid strokeDasharray="3 3" stroke="#DDE6EF" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => brl(v).replace(/ /g, ' ')} tick={{ fontSize: 11 }} width={70} />
        <Tooltip content={<ChartTooltip />} />
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
        <Tooltip formatter={(value: number) => brl(value)} />
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
        <CartesianGrid strokeDasharray="3 3" stroke="#DDE6EF" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
        <Tooltip content={<ChartTooltip />} />
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
          <Tooltip formatter={(value: number, name: string) => [`${value} (${Math.round((value / total) * 100)}%)`, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 top-0 grid place-content-center text-center" style={{ bottom: 0 }}>
        <p className="font-display text-2xl font-bold">{total}</p>
        <p className="text-[11px] text-muted-foreground">mensalidades</p>
      </div>
    </div>
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
        <CartesianGrid strokeDasharray="3 3" stroke="#DDE6EF" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="target" name="Meta" fill={COLORS.muted} radius={[4, 4, 0, 0]} />
        <Bar dataKey="actual" name="Realizado" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
