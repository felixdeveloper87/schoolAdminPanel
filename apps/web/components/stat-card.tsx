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
    primary: { icon: 'bg-[#eef5ff] text-[#6497ff]', blob: 'bg-[#f1f6ff]', spark: 'text-[#5791ff]' },
    success: { icon: 'bg-[#e9f8f3] text-[#2ebd91]', blob: 'bg-[#edf8f4]', spark: 'text-[#2ebd91]' },
    destructive: { icon: 'bg-[#fff0f2] text-[#f06277]', blob: 'bg-[#fdf1f3]', spark: 'text-[#f06277]' },
    accent: { icon: 'bg-[#fff6df] text-[#e9a516]', blob: 'bg-[#fff8e9]', spark: 'text-[#e9a516]' },
    violet: { icon: 'bg-[#f0edff] text-[#7764f5]', blob: 'bg-[#f2f0ff]', spark: 'text-[#7764f5]' },
  }[accent];

  return (
    <Card
      className={cn(
        'group relative overflow-hidden rounded-[22px] border border-white/80 bg-white/95 shadow-[0_1px_2px_rgba(16,24,40,.03),0_12px_30px_rgba(34,45,75,.07)] transition-all hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(16,24,40,.04),0_20px_40px_rgba(34,45,75,.10)]',
        compact ? 'min-h-[132px] p-4 sm:min-h-[158px] sm:p-5' : 'min-h-[142px] p-4 sm:min-h-[168px] sm:p-5',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('pointer-events-none absolute -bottom-12 -right-8 h-32 w-32 rounded-full', accentClasses.blob)}
      />
      <div className={cn('relative flex h-full flex-col justify-between', compact ? 'gap-3' : 'gap-4')}>
        <div className="flex items-start justify-between gap-3">
          <p className={cn('font-extrabold uppercase tracking-[0.09em] text-[#657189]', compact ? 'text-[10px]' : 'text-xs')}>
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
              'break-words font-display font-extrabold leading-tight tabular-nums text-[#10192a]',
              compact ? 'text-xl sm:text-[28px]' : 'text-2xl sm:text-3xl',
              money && 'tracking-tight',
            )}
          >
            {value}
          </p>
          {(trend || hint) && (
            <p
              className={cn(
                'text-[#6d7890]',
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
