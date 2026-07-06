import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  accent = 'primary',
  money = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'primary' | 'success' | 'destructive' | 'accent';
  money?: boolean;
}) {
  const accentVar = {
    primary: 'var(--primary)',
    success: 'var(--success)',
    destructive: 'var(--destructive)',
    accent: 'var(--accent)',
  }[accent];

  return (
    <Card
      className="notebook-card p-5"
      style={{ ['--notebook-accent' as string]: accentVar }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold', money ? 'money' : 'font-display')}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
