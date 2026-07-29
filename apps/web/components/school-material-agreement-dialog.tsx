'use client';

import { CheckCircle2 } from 'lucide-react';
import { INVOICE_STATUS_LABELS, type InvoiceStatus } from '@escola/contracts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { brl, formatDate } from '@/lib/format';
import { UndoAgreementButton } from '@/components/undo-agreement-button';

type Installment = { id: string; status: InvoiceStatus; installmentNumber: number; installmentCount: number; amountCents: number; discountCents: number; dueDate: string };

export function SchoolMaterialAgreementDialog({ studentName, installments, trigger, isAdmin = true }: { studentName: string; installments: Installment[]; trigger: React.ReactNode; isAdmin?: boolean }) {
  const total = installments.reduce((value, installment) => value + installment.amountCents - installment.discountCents, 0);
  return <Dialog><DialogTrigger asChild>{trigger}</DialogTrigger><DialogContent><DialogHeader><DialogTitle>Acordo de material escolar</DialogTitle><DialogDescription>Condições registradas para {studentName}.</DialogDescription></DialogHeader><div className="rounded-lg border bg-muted/40 p-3 text-sm"><p className="text-xs text-muted-foreground">Total do material</p><p className="mt-0.5 font-bold">{brl(total)}</p></div><div className="space-y-2"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Parcelas</p>{installments.map((installment) => <div key={installment.installmentNumber} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm"><div><p className="font-bold">Parcela {installment.installmentNumber}/{installment.installmentCount}</p><p className="text-xs text-muted-foreground">Vencimento: {formatDate(installment.dueDate)} · {INVOICE_STATUS_LABELS[installment.status]}</p></div><p className="font-bold">{brl(installment.amountCents - installment.discountCents)}</p></div>)}</div><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> A cobrança já foi gerada.</p>{isAdmin && <UndoAgreementButton invoiceIds={installments.map((installment) => installment.id)} label="material escolar" />}</div></DialogContent></Dialog>;
}
