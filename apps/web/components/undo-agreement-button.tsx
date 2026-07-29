'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function UndoAgreementButton({ invoiceIds, label }: { invoiceIds: string[]; label: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const undo = async () => {
    setBusy(true);
    setError(null);
    const response = await fetch('/api/invoices/agreements', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceIds }),
    });
    setBusy(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(typeof body?.message === 'string' ? body.message : 'Não foi possível desfazer o acordo.');
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button type="button" variant="destructive" size="sm">Desfazer acordo</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Desfazer acordo?</DialogTitle><DialogDescription>As parcelas pendentes deste acordo de {label} serão excluídas. Esta ação não pode ser desfeita.</DialogDescription></DialogHeader>{error && <p className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button><Button type="button" variant="destructive" onClick={undo} disabled={busy}>{busy ? 'Desfazendo…' : 'Sim, desfazer acordo'}</Button></div></DialogContent></Dialog>;
}
