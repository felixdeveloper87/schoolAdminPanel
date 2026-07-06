import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  accent = 'primary',
  money = false,
  compact = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'primary' | 'success' | 'destructive' | 'accent';
  money?: boolean;
  compact?: boolean;
}) {
  const accentVar = {
    primary: 'var(--primary)',
    success: 'var(--success)',
    destructive: 'var(--destructive)',
    accent: 'var(--accent)',
  }[accent];

  return (
    <Card
      className={cn(
        'notebook-card group transition-all hover:-translate-y-0.5 hover:shadow-md',
        compact ? 'min-h-[92px] p-3 sm:min-h-[108px] sm:p-4' : 'min-h-[112px] p-4 sm:min-h-[132px] sm:p-5',
      )}
      style={{ ['--notebook-accent' as string]: accentVar }}
    >
      <div className={cn('flex h-full flex-col justify-between', compact ? 'gap-2' : 'gap-3')}>
        <div className="flex items-start justify-between gap-3">
          <p className={cn('font-bold uppercase text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
            {label}
          </p>
          <span
            className={cn('mt-0.5 rounded-full', compact ? 'h-2 w-2' : 'h-2.5 w-2.5')}
            style={{ backgroundColor: `hsl(${accentVar})` }}
          />
        </div>
        <div>
          <p
            className={cn(
              'break-words font-bold leading-tight',
              compact ? 'text-sm min-[380px]:text-base sm:text-xl md:text-2xl' : 'text-base min-[380px]:text-lg sm:text-2xl md:text-3xl',
              money ? 'money' : 'font-display',
            )}
          >
            {value}
          </p>
          {hint && (
            <p
              className={cn(
                'text-muted-foreground',
                compact ? 'mt-1 text-[10px] leading-snug sm:text-[11px]' : 'mt-1.5 text-[11px] leading-snug sm:mt-2 sm:text-xs sm:leading-relaxed',
              )}
            >
              {hint}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
