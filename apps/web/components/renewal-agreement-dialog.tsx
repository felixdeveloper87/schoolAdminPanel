'use client';

import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from '@escola/contracts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { brl, formatDate } from '@/lib/format';

type Installment = {
  status: InvoiceStatus;
  installmentNumber: number;
  installmentCount: number;
  amountCents: number;
  materialCents: number;
  discountCents: number;
  dueDate: string;
};

export function RenewalAgreementDialog({
  studentName,
  installments,
  trigger,
}: {
  studentName: string;
  installments: Installment[];
  trigger: React.ReactNode;
}) {
  const totalCents = installments.reduce((total, installment) => total + installment.amountCents - installment.discountCents, 0);
  const materialCents = installments.reduce((total, installment) => total + installment.materialCents, 0);
  const discountCents = installments.reduce((total, installment) => total + installment.discountCents, 0);
  const renewalFeeCents = installments.reduce((total, installment) => total + installment.amountCents - installment.materialCents, 0);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acordo de rematrícula</DialogTitle>
          <DialogDescription>Condições registradas para {studentName}.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Taxa de rematrícula</p><p className="mt-0.5 font-bold">{brl(renewalFeeCents)}</p></div>
          <div><p className="text-xs text-muted-foreground">Material didático</p><p className="mt-0.5 font-bold">{brl(materialCents)}</p></div>
          {discountCents > 0 && <div><p className="text-xs text-muted-foreground">Desconto aplicado</p><p className="mt-0.5 font-bold text-success">−{brl(discountCents)}</p></div>}
          <div><p className="text-xs text-muted-foreground">Total do acordo</p><p className="mt-0.5 font-bold">{brl(totalCents)}</p></div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Parcelas</p>
          {installments.map((installment) => (
            <div key={installment.installmentNumber} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm">
              <div>
                <p className="font-bold">Parcela {installment.installmentNumber}/{installment.installmentCount}</p>
                <p className="text-xs text-muted-foreground">Vencimento: {formatDate(installment.dueDate)} · {INVOICE_STATUS_LABELS[installment.status]}</p>
              </div>
              <p className="font-bold">{brl(installment.amountCents - installment.discountCents)}</p>
            </div>
          ))}
        </div>

        <p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> A cobrança já foi gerada.</p>
      </DialogContent>
    </Dialog>
  );
}
