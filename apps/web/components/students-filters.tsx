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
    <div className="rounded-[22px] border border-[#dce6f0] bg-white/95 p-4 shadow-[0_12px_35px_rgba(35,49,79,.06)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <form
          className="relative min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            apply({ q: q.trim() });
          }}
        >
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8995aa]" />
          <Input
            className="h-12 rounded-xl border-[#d7e1ec] bg-[#f8fafc] pl-11 pr-11 shadow-none placeholder:text-[#9ba5b6] focus-visible:bg-white"
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
              className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-[#8995aa] hover:bg-[#eaf0f6] hover:text-[#26344d]"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex max-w-full overflow-x-auto rounded-xl bg-[#f0f3f8] p-1">
          <button
            type="button"
            onClick={() => apply({ status: 'ACTIVE' })}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-extrabold transition-all',
              status === 'ACTIVE'
                ? 'bg-white text-[#3157b7] shadow-sm'
                : 'text-[#6b778e] hover:text-[#26344d]',
            )}
          >
            <Users className="h-4 w-4" />
            Ativos
            <span className={cn('rounded-full px-2 py-0.5 text-[10px]', status === 'ACTIVE' ? 'bg-[#edf2ff]' : 'bg-white/70')}>
              {activeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => apply({ status: 'WAITLIST' })}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-extrabold transition-all',
              status === 'WAITLIST'
                ? 'bg-white text-[#a66b08] shadow-sm'
                : 'text-[#6b778e] hover:text-[#26344d]',
            )}
          >
            <Hourglass className="h-4 w-4" />
            Lista de espera
            <span className={cn('rounded-full px-2 py-0.5 text-[10px]', status === 'WAITLIST' ? 'bg-[#fff5df]' : 'bg-white/70')}>
              {waitlistCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => apply({ status: 'INACTIVE' })}
            className={cn(
              'flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-xs font-extrabold transition-all',
              status === 'INACTIVE'
                ? 'bg-white text-[#68758b] shadow-sm'
                : 'text-[#6b778e] hover:text-[#26344d]',
            )}
          >
            <UserX className="h-4 w-4" />
            Ex-alunos
            <span className={cn('rounded-full px-2 py-0.5 text-[10px]', status === 'INACTIVE' ? 'bg-[#eef1f5]' : 'bg-white/70')}>
              {inactiveCount}
            </span>
          </button>
        </div>

        <div className="relative min-w-[210px]">
          <School className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#758198]" />
          <Select
            aria-label="Filtrar por turma"
            className="h-12 rounded-xl border-[#d7e1ec] bg-[#f8fafc] pl-10 pr-9 shadow-none"
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
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-[#69758b] hover:bg-[#f1f4f8] hover:text-[#28364d]"
          >
            <X className="h-3.5 w-3.5" /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}
