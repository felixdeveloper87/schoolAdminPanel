'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { currentCompetence, todayDateInput } from '@/lib/format';

const toCents = (value: string) => Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100) || 0;

export function SchoolMaterialChargeDialog({
  students = [],
  initialEnrollmentId,
  studentName,
  trigger,
}: {
  students?: Array<{ enrollmentId: string | null; fullName: string }>;
  initialEnrollmentId?: string;
  studentName?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = React.useState(initialEnrollmentId ?? '');
  const [amount, setAmount] = React.useState('');
  const [competence, setCompetence] = React.useState(currentCompetence());
  const [dueDate, setDueDate] = React.useState(todayDateInput());
  const [installments, setInstallments] = React.useState(1);

  const submit = async () => {
    const materialFeeCents = toCents(amount);
    if (!enrollmentId || materialFeeCents <= 0) {
      setError('Escolha o aluno e informe o valor do material.');
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch('/api/invoices/school-material', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId, materialFeeCents, competence, dueDate, installments }),
    });
    setBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(typeof body?.message === 'string' ? body.message : 'Não foi possível criar a cobrança.');
      return;
    }
    setOpen(false);
    setAmount('');
    setEnrollmentId(initialEnrollmentId ?? '');
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button>Novo material escolar</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Material escolar</DialogTitle><DialogDescription>Registre uma cobrança de material separada da rematrícula{studentName ? ` para ${studentName}` : ''}.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {!initialEnrollmentId && <div className="space-y-1.5 sm:col-span-2"><Label>Aluno</Label><Select value={enrollmentId} onChange={(event) => setEnrollmentId(event.target.value)}><option value="">Escolha o aluno…</option>{students.filter((student) => student.enrollmentId).map((student) => <option key={student.enrollmentId} value={student.enrollmentId!}>{student.fullName}</option>)}</Select></div>}
          <div className="space-y-1.5"><Label>Valor (R$)</Label><Input inputMode="decimal" placeholder="650,00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>Parcelas</Label><Select value={String(installments)} onChange={(event) => setInstallments(Number(event.target.value))}><option value="1">À vista</option><option value="2">2x mensais</option><option value="3">3x mensais</option></Select></div>
          <div className="space-y-1.5"><Label>Competência</Label><Input type="month" value={competence} onChange={(event) => setCompetence(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>Vencimento</Label><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button><Button onClick={submit} disabled={busy}>{busy ? 'Criando…' : 'Criar cobrança'}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
