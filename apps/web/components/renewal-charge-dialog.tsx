'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { brl, currentCompetence, todayDateInput } from '@/lib/format';

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
  const [renewalFee, setRenewalFee] = React.useState('');
  const [entry, setEntry] = React.useState('');
  const [discount, setDiscount] = React.useState('');
  const [competence, setCompetence] = React.useState(currentCompetence());
  const [dueDate, setDueDate] = React.useState(todayDateInput());
  const [installments, setInstallments] = React.useState(1);

  const renewalFeeCents = toCents(renewalFee) || 0;
  const entryCents = toCents(entry) || 0;
  const discountCents = toCents(discount) || 0;
  const grossTotalCents = renewalFeeCents;
  const totalCents = grossTotalCents - discountCents;

  const submit = async () => {
    if (!Number.isFinite(grossTotalCents) || grossTotalCents <= 0) {
      setError('Informe a taxa de rematrícula.');
      return;
    }
    if (!Number.isFinite(discountCents) || discountCents < 0 || discountCents > grossTotalCents) {
      setError('O desconto não pode ser maior que o total da cobrança.');
      return;
    }
    if (!Number.isFinite(entryCents) || entryCents < 0 || entryCents > totalCents) {
      setError('A entrada nao pode ser maior que o total apos o desconto.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentId, renewalFeeCents, entryCents, discountCents, competence, dueDate, installments }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.message === 'string' ? body.message : 'Não foi possível gerar a rematrícula.');
      return;
    }
    setOpen(false);
    setRenewalFee('');
    setEntry('');
    setDiscount('');
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar rematrícula</DialogTitle>
          <DialogDescription>Informe os valores de {studentName}. O total pode ser dividido em até 3 parcelas.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Taxa de rematrícula (R$)</Label><Input inputMode="decimal" placeholder="450,00" value={renewalFee} onChange={(event) => setRenewalFee(event.target.value)} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Desconto manual (R$)</Label><Input inputMode="decimal" placeholder="0,00" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>Competência</Label><Input type="month" value={competence} onChange={(event) => setCompetence(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>Vencimento</Label><Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
          <div className="space-y-1.5"><Label>Parcelas</Label><Select value={String(installments)} onChange={(event) => setInstallments(Number(event.target.value))}><option value="1">À vista</option><option value="2">2x mensais</option><option value="3">3x mensais</option></Select></div>
        </div>
        <div className="space-y-1.5"><Label>Valor de entrada (R$)</Label><Input inputMode="decimal" placeholder="Opcional" value={entry} onChange={(event) => setEntry(event.target.value)} /><p className="text-xs text-muted-foreground">A entrada vence primeiro; o saldo é dividido nas parcelas abaixo.</p></div>
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
          {discountCents > 0 && <p className="text-muted-foreground">Total antes do desconto: {brl(Math.max(0, grossTotalCents))}</p>}
          <span className="text-muted-foreground">Total a parcelar: </span><strong>{brl(Math.max(0, totalCents))}</strong>
        </div>
        {installments > 1 && <p className="text-xs text-muted-foreground">{entryCents > 0 ? `Após a entrada, o saldo será dividido em ${installments} vencimentos mensais consecutivos.` : `O total será dividido em ${installments} vencimentos mensais consecutivos.`}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button><Button onClick={submit} disabled={busy}>{busy ? 'Gerando…' : 'Gerar rematrícula'}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
