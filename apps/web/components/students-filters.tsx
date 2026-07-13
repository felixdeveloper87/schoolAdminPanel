'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Hourglass, School, Search, UserX, Users, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type BoardStatus = 'ACTIVE' | 'WAITLIST' | 'INACTIVE';

export function StudentsFilters({
  classrooms,
  activeCount,
  waitlistCount,
  inactiveCount,
}: {
  classrooms: { id: string; name: string }[];
  activeCount: number;
  waitlistCount: number;
  inactiveCount: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState(searchParams.get('q') ?? '');
  const requestedStatus = searchParams.get('status');
  const status: BoardStatus = requestedStatus === 'WAITLIST' || requestedStatus === 'INACTIVE' ? requestedStatus : 'ACTIVE';
  const hasFilters = Boolean(searchParams.get('q') || searchParams.get('classroomId') || status !== 'ACTIVE');

  React.useEffect(() => {
    setQ(searchParams.get('q') ?? '');
  }, [searchParams]);

  const apply = (overrides: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete('page');
    const query = params.toString();
    router.push(query ? `/alunos?${query}` : '/alunos');
  };

  const reset = () => {
    setQ('');
    router.push('/alunos?status=ACTIVE');
  };

  return (
    <div className="rounded-[22px] border border-border bg-card/95 p-4 shadow-[0_12px_35px_rgba(35,49,79,.06)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <form
          className="relative min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            apply({ q: q.trim() });
          }}
        >
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 rounded-xl border-border bg-muted/60 pl-11 pr-11 shadow-none placeholder:text-muted-foreground focus-visible:bg-card"
            placeholder="Buscar aluno por nome..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                apply({ q: '' });
              }}
              className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex max-w-full overflow-x-auto rounded-xl bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => apply({ status: 'ACTIVE' })}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-extrabold transition-all',
              status === 'ACTIVE'
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Users className="h-4 w-4" />
            Ativos
            <span className={cn('rounded-full px-2 py-0.5 text-[10px]', status === 'ACTIVE' ? 'bg-brand/10' : 'bg-card/70')}>
              {activeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => apply({ status: 'WAITLIST' })}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-extrabold transition-all',
              status === 'WAITLIST'
                ? 'bg-card text-accent-deep shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Hourglass className="h-4 w-4" />
            Lista de espera
            <span className={cn('rounded-full px-2 py-0.5 text-[10px]', status === 'WAITLIST' ? 'bg-accent/15' : 'bg-card/70')}>
              {waitlistCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => apply({ status: 'INACTIVE' })}
            className={cn(
              'flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-xs font-extrabold transition-all',
              status === 'INACTIVE'
                ? 'bg-card text-muted-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <UserX className="h-4 w-4" />
            Ex-alunos
            <span className={cn('rounded-full px-2 py-0.5 text-[10px]', status === 'INACTIVE' ? 'bg-muted/60' : 'bg-card/70')}>
              {inactiveCount}
            </span>
          </button>
        </div>

        <div className="relative min-w-[210px]">
          <School className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Select
            aria-label="Filtrar por turma"
            className="h-12 rounded-xl border-border bg-muted/60 pl-10 pr-9 shadow-none"
            value={searchParams.get('classroomId') ?? ''}
            onChange={(event) => apply({ classroomId: event.target.value })}
          >
            <option value="">Todas as turmas</option>
            {classrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </Select>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-muted-foreground hover:bg-primary/10 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}
