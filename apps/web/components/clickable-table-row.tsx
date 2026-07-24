'use client';

import { type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface ClickableTableRowProps {
  href: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}

export function ClickableTableRow({ href, ariaLabel, className, children }: ClickableTableRowProps) {
  const router = useRouter();
  const navigate = () => router.push(href);

  const handleClick = (event: MouseEvent<HTMLTableRowElement>) => {
    const target = event.target;
    if (target instanceof Element && target.closest('a, button, input, select, textarea')) return;
    navigate();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    navigate();
  };

  return (
    <TableRow
      tabIndex={0}
      aria-label={ariaLabel}
      className={cn('cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset', className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </TableRow>
  );
}
