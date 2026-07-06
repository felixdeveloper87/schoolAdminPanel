'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { brl, todayDateInput } from '@/lib/format';

interface ClassroomOption {
  id: string;
  name: string;
  activeCount: number;
  capacity: number;
}

interface EnrollmentRow {
  id: string;
  monthlyFeeCents: number;
  discountCents: number;
  status: string;
  classroom: { id: string; name: string };
  student: { id: string; fullName: string };
}

export function RenewBatchDialog({ classrooms }: { classrooms: ClassroomOption[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [sourceId, setSourceId] = React.useState('');
  const [targetId, setTargetId] = React.useState('');
  const [readjustPercent, setReadjustPercent] = React.useState(10);
  const [newStartDate, setNewStartDate] = React.useState(todayDateInput());
  const [chargeEnrollmentFee, setChargeEnrollmentFee] = React.useState(true);
  const [students, setStudents] = React.useState<EnrollmentRow[]>([]);
  const [overrides, setOverrides] = React.useState<Record<string, string>>({});
  const [loadingStudents, setLoadingStudents] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!sourceId) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    fetch('/api/enrollments')
      .then((r) => r.json())
      .then((all: EnrollmentRow[]) => {
        const active = all.filter((e) => e.classroom.id === sourceId && e.status === 'ACTIVE');
        setStudents(active);
        setOverrides({});
      })
      .finally(() => setLoadingStudents(false));
  }, [sourceId]);

  const readjustedFee = (cents: number) => Math.round(cents * (1 + readjustPercent / 100));

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/enrollments/renew-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classroomId: sourceId,
        targetClassroomId: targetId,
        readjustPercent,
        newStartDate,
        chargeEnrollmentFee,
        overrides: Object.entries(overrides)
          .filter(([, v]) => v !== '')
          .map(([enrollmentId, v]) => ({
            enrollmentId,
            monthlyFeeCents: Math.round(Number(v.replace(/\./g, '').replace(',', '.')) * 100),
          })),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.message === 'string' ? body.message : 'Erro ao rematricular em lote');
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Rematricular turma</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rematrícula em lote</DialogTitle>
          <DialogDescription>
            Clona as matrículas ativas de uma turma para outra (normalmente a turma do ano seguinte),
            aplicando reajuste percentual em massa — editável aluno a aluno.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Turma de origem</Label>
            <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              <option value="">Escolha…</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.activeCount} ativos)
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Turma de destino</Label>
            <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Escolha…</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.activeCount}/{c.capacity})
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reajuste (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={readjustPercent}
              onChange={(e) => setReadjustPercent(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nova data de início</Label>
            <Input type="date" value={newStartDate} onChange={(e) => setNewStartDate(e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              id="chargeFee"
              type="checkbox"
              className="h-4 w-4"
              checked={chargeEnrollmentFee}
              onChange={(e) => setChargeEnrollmentFee(e.target.checked)}
            />
            <Label htmlFor="chargeFee">Cobrar taxa de matrícula na mensalidade de janeiro</Label>
          </div>
        </div>

        {sourceId && (
          <div className="max-h-64 overflow-y-auto rounded-md border">
            {loadingStudents ? (
              <p className="p-4 text-sm text-muted-foreground">Carregando alunos…</p>
            ) : students.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhuma matrícula ativa nesta turma.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Aluno</th>
                    <th className="px-3 py-2 text-left">Valor atual</th>
                    <th className="px-3 py-2 text-left">Novo valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const current = s.monthlyFeeCents - s.discountCents;
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="px-3 py-2">{s.student.fullName}</td>
                        <td className="money px-3 py-2 text-muted-foreground">{brl(current)}</td>
                        <td className="px-3 py-2">
                          <Input
                            className="h-8"
                            placeholder={(readjustedFee(current) / 100).toFixed(2).replace('.', ',')}
                            value={overrides[s.id] ?? ''}
                            onChange={(e) => setOverrides((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy || !sourceId || !targetId}>
            {busy ? 'Rematriculando…' : 'Confirmar rematrícula'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
