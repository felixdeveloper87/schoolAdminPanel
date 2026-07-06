import * as React from 'react';
import { cn } from '@/lib/utils';

/** Select nativo estilizado — leve e confiável para 2-3 usuários em VPS fraca. */
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-11 w-full appearance-none rounded-md border border-input bg-card/95 px-3 py-2 text-sm shadow-sm shadow-slate-200/60 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export { Select };
