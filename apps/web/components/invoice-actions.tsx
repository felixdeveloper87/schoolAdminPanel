'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  payInvoiceSchema,
  PayInvoiceInput,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  InvoiceStatus,
} from '@escola/contracts';
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

interface InvoiceActionsProps {
  invoiceId: string;
  studentName: string;
  effectiveCents: number;
  status: InvoiceStatus;
  isAdmin: boolean;
}

function ConfirmInvoiceAction({
  title,
  description,
  confirmLabel,
  variant = 'default',
  disabled,
  busy,
  error,
  onConfirm,
}: {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  variant?: 'default' | 'destructive';
  disabled: boolean;
  busy: boolean;
  error: string | null;
  onConfirm: () => Promise<boolean>;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled}>
          {confirmLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={variant}
            disabled={busy}
            onClick={async () => {
              if (await onConfirm()) setOpen(false);
            }}
          >
            {busy ? 'Salvando…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function InvoiceActions({ invoiceId, studentName, effectiveCents, status, isAdmin }: InvoiceActionsProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PayInvoiceInput>({
    resolver: zodResolver(payInvoiceSchema),
    defaultValues: { method: 'PIX', paidAt: todayDateInput() },
  });

  const patch = async (path: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/invoices/${invoiceId}/${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message ?? 'Erro ao atualizar');
      return false;
    }
    router.refresh();
    return true;
  };

  if (status === 'PAID') {
    return (
      <div className="flex items-center justify-end gap-1">
        {isAdmin && (
          <ConfirmInvoiceAction
            title="Desfazer pagamento?"
            description={
              <>
                O pagamento de <strong>{studentName}</strong> no valor de <span className="money font-semibold">{brl(effectiveCents)}</span>{' '}
                voltará para pendente.
              </>
            }
            confirmLabel="Desfazer"
            variant="destructive"
            disabled={busy}
            busy={busy}
            error={error}
            onConfirm={() => patch('revert')}
          />
        )}
      </div>
    );
  }

  if (status !== 'PENDING' && status !== 'OVERDUE') return null;

  return (
    <div className="flex items-center justify-end gap-1">
      {isAdmin && (
        <ConfirmInvoiceAction
          title="Isentar mensalidade?"
          description={
            <>
              A mensalidade de <strong>{studentName}</strong> no valor de <span className="money font-semibold">{brl(effectiveCents)}</span>{' '}
              será marcada como isenta e não poderá mais ser recebida.
            </>
          }
          confirmLabel="Isentar"
          disabled={busy}
          busy={busy}
          error={error}
          onConfirm={() => patch('exempt')}
        />
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="success" size="sm">
            Marcar pago
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pagamento</DialogTitle>
            <DialogDescription>
              {studentName} — <span className="money font-semibold">{brl(effectiveCents)}</span>
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(async (data) => {
              if (await patch('pay', data)) setOpen(false);
            })}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`method-${invoiceId}`}>Método</Label>
                <Select id={`method-${invoiceId}`} {...register('method')}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`paidAt-${invoiceId}`}>Data do pagamento</Label>
                <Input id={`paidAt-${invoiceId}`} type="date" {...register('paidAt')} />
                {errors.paidAt && <p className="text-xs text-destructive">{errors.paidAt.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`note-${invoiceId}`}>Observação do comprovante (opcional)</Label>
              <Input
                id={`note-${invoiceId}`}
                placeholder="ex.: comprovante no WhatsApp 06/07"
                {...register('receiptNote')}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="success" disabled={isSubmitting}>
                Confirmar pagamento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
