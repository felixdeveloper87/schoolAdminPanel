'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { INVOICE_TYPE_LABELS, type InvoiceType } from '@escola/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { currentCompetence, todayDateInput } from '@/lib/format';

interface EnrollmentRow {
  id: string;
  status: string;
  student: { fullName: string };
  classroom: { name: string };
}

const ADDITIONAL_TYPES: InvoiceType[] = ['ENROLLMENT_FEE', 'RENEWAL_FEE', 'SCHOOL_MATERIAL'];

function toCents(value: string) {
  return Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100);
}

export function CreateAdditionalInvoiceDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [enrollments, setEnrollments] = React.useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [enrollmentId, setEnrollmentId] = React.useState('');
  const [type, setType] = React.useState<InvoiceType>('RENEWAL_FEE');
  const [amount, setAmount] = React.useState('');
  const [competence, setCompetence] = React.useState(currentCompetence());
  const [dueDate, setDueDate] = React.useState(todayDateInput());
  const [installments, setInstallments] = React.useState(1);

  React.useEffect(() => {
    if (!open || enrollments.length) return;
    setLoading(true);
    fetch('/api/enrollments')
      .then((res) => res.json())
      .then((items: EnrollmentRow[]) => setEnrollments(items.filter((item) => item.status === 'ACTIVE')))
      .catch(() => setError('Não foi possível carregar os alunos.'))
      .finally(() => setLoading(false));
  }, [open, enrollments.length]);

  const submit = async () => {
    const amountCents = toCents(amount);
    if (!enrollmentId || !Number.isFinite(amountCents) || amountCents <= 0) {
      setError('Escolha o aluno e informe um valor válido.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId, type, amountCents, competence, dueDate, installments }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.message === 'string' ? body.message : 'Não foi possível criar a cobrança.');
      return;
    }
    setOpen(false);
    setEnrollmentId('');
    setAmount('');
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl"><Plus className="h-4 w-4" /> Nova cobrança</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova cobrança avulsa</DialogTitle>
          <DialogDescription>Crie taxa de matrícula, rematrícula ou material escolar, à vista ou em até 3 parcelas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Aluno</Label>
            <Select value={enrollmentId} onChange={(event) => setEnrollmentId(event.target.value)} disabled={loading}>
              <option value="">{loading ? 'Carregando…' : 'Escolha o aluno…'}</option>
              {enrollments.map((enrollment) => <option key={enrollment.id} value={enrollment.id}>{enrollment.student.fullName} · {enrollment.classroom.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onChange={(event) => setType(event.target.value as InvoiceType)}>
                {ADDITIONAL_TYPES.map((item) => <option key={item} value={item}>{INVOICE_TYPE_LABELS[item]}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor total (R$)</Label>
              <Input inputMode="decimal" placeholder="450,00" value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Competência</Label>
              <Input type="month" value={competence} onChange={(event) => setCompetence(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Parcelas</Label>
              <Select value={String(installments)} onChange={(event) => setInstallments(Number(event.target.value))}>
                <option value="1">À vista</option>
                <option value="2">2x mensais</option>
                <option value="3">3x mensais</option>
              </Select>
            </div>
          </div>
          {installments > 1 && amount && Number.isFinite(toCents(amount)) && (
            <p className="text-xs text-muted-foreground">O total será dividido em {installments} vencimentos mensais consecutivos.</p>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} disabled={busy || loading}>{busy ? 'Criando…' : 'Criar cobrança'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
