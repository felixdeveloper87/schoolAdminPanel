'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { currentCompetence, todayDateInput } from '@/lib/format';

function toCents(value: string) {
  return Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100);
}

export function RenewalChargeDialog({
  enrollmentId,
  studentName,
  trigger,
}: {
  enrollmentId: string;
  studentName: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [amount, setAmount] = React.useState('');
  const [competence, setCompetence] = React.useState(currentCompetence());
  const [dueDate, setDueDate] = React.useState(todayDateInput());
  const [installments, setInstallments] = React.useState(1);

  const submit = async () => {
    const amountCents = toCents(amount);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError('Informe um valor válido para a taxa de rematrícula.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId, amountCents, competence, dueDate, installments }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.message === 'string' ? body.message : 'Não foi possível gerar a rematrícula.');
      return;
    }
    setOpen(false);
    setAmount('');
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar rematrícula</DialogTitle>
          <DialogDescription>Gere a taxa de rematrícula de {studentName} em até 3 parcelas.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5"><Label>Valor total (R$)</Label><Input inputMode="decimal" placeholder="450,00" value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>Competência</Label><Input type="month" value={competence} onChange={(event) => setCompetence(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>Vencimento</Label><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>Parcelas</Label><Select value={String(installments)} onChange={(event) => setInstallments(Number(event.target.value))}><option value="1">À vista</option><option value="2">2x mensais</option><option value="3">3x mensais</option></Select></div>
        </div>
        {installments > 1 && <p className="text-xs text-muted-foreground">O valor será dividido em {installments} vencimentos mensais consecutivos.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button><Button onClick={submit} disabled={busy}>{busy ? 'Gerando…' : 'Gerar rematrícula'}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
