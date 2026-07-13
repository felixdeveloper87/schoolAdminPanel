import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const width = 92;
  const height = 40;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 6) - 3,
  }));

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('pointer-events-none absolute bottom-3 right-3 h-10 w-[88px] opacity-80', className)}
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  sparkline,
  accent = 'primary',
  money = false,
  compact = false,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: { value: string; direction: 'up' | 'down' };
  icon?: LucideIcon;
  sparkline?: number[];
  accent?: 'primary' | 'success' | 'destructive' | 'accent' | 'violet';
  money?: boolean;
  compact?: boolean;
}) {
  const accentClasses = {
    primary: { icon: 'bg-primary/10 text-primary', blob: 'bg-primary/[0.07]', spark: 'text-primary' },
    success: { icon: 'bg-success/10 text-success', blob: 'bg-success/[0.07]', spark: 'text-success' },
    destructive: { icon: 'bg-destructive/10 text-destructive', blob: 'bg-destructive/[0.07]', spark: 'text-destructive' },
    accent: { icon: 'bg-accent/15 text-accent-deep', blob: 'bg-accent/[0.08]', spark: 'text-accent-deep' },
    violet: { icon: 'bg-brand/10 text-brand', blob: 'bg-brand/[0.07]', spark: 'text-brand' },
  }[accent];

  return (
    <Card
      className={cn(
        'group relative overflow-hidden rounded-[22px] border border-border/60 bg-card/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_12px_30px_rgba(34,45,75,.07)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(16,24,40,.04),0_20px_40px_rgba(34,45,75,.10)]',
        compact ? 'min-h-[132px] p-4 sm:min-h-[158px] sm:p-5' : 'min-h-[142px] p-4 sm:min-h-[168px] sm:p-5',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('pointer-events-none absolute -bottom-12 -right-8 h-32 w-32 rounded-full', accentClasses.blob)}
      />
      <div className={cn('relative flex h-full flex-col justify-between', compact ? 'gap-3' : 'gap-4')}>
        <div className="flex items-start justify-between gap-3">
          <p className={cn('font-extrabold uppercase tracking-[0.09em] text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
            {label}
          </p>
          {Icon && (
            <span
              className={cn(
                'grid flex-none place-items-center rounded-xl',
                compact ? 'h-10 w-10' : 'h-11 w-11',
                accentClasses.icon,
              )}
            >
              <Icon className={compact ? 'h-[18px] w-[18px]' : 'h-5 w-5'} />
            </span>
          )}
        </div>
        <div>
          <p
            className={cn(
              'break-words font-display font-extrabold leading-tight tabular-nums text-foreground',
              compact ? 'text-xl sm:text-[28px]' : 'text-2xl sm:text-3xl',
              money && 'tracking-tight',
            )}
          >
            {value}
          </p>
          {(trend || hint) && (
            <p
              className={cn(
                'text-muted-foreground',
                compact ? 'mt-1.5 text-[11px] leading-snug' : 'mt-2 text-xs leading-relaxed',
              )}
            >
              {trend && (
                <span className={cn('font-bold', trend.direction === 'up' ? 'text-success' : 'text-destructive')}>
                  {trend.value}
                </span>
              )}
              {trend && hint && ' '}
              {hint}
            </p>
          )}
        </div>
      </div>
      {sparkline && <Sparkline values={sparkline} className={accentClasses.spark} />}
    </Card>
  );
}
