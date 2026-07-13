'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { brl, formatCompetence } from '@/lib/format';

const monthLabel = (competence: string) => formatCompetence(competence).split(' de ')[0].slice(0, 3);

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      <p style={{ color: payload[0].color }}>{brl(payload[0].value)}</p>
    </div>
  );
}

export function ExpensesTrendChart({ data }: { data: { competence: string; totalCents: number }[] }) {
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.competence) }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tickFormatter={(v) => brl(v)} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={70} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.6)' }} />
        <Bar dataKey="totalCents" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
