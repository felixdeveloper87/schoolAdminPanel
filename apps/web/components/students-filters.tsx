'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { STUDENT_STATUSES, STUDENT_STATUS_LABELS } from '@escola/contracts';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export function StudentsFilters({ classrooms }: { classrooms: { id: string; name: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState(searchParams.get('q') ?? '');

  const apply = (overrides: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete('page');
    router.push(`/alunos?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative min-w-52 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q });
        }}
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <Select
        className="w-40"
        value={searchParams.get('status') ?? ''}
        onChange={(e) => apply({ status: e.target.value })}
      >
        <option value="">Todos os status</option>
        {STUDENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STUDENT_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      <Select
        className="w-48"
        value={searchParams.get('classroomId') ?? ''}
        onChange={(e) => apply({ classroomId: e.target.value })}
      >
        <option value="">Todas as turmas</option>
        {classrooms.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
