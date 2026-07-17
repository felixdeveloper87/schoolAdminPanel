'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DeleteConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  /** Endpoint que recebe o DELETE, ex.: /api/students/abc123 */
  url: string;
  confirmLabel?: string;
  /** Para onde navegar após excluir; sem valor, apenas atualiza a página atual. */
  redirectTo?: string;
}

export function DeleteConfirmDialog({
  trigger,
  title,
  description,
  url,
  confirmLabel = 'Excluir definitivamente',
  redirectTo,
}: DeleteConfirmDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(url, { method: 'DELETE' });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.message === 'string' ? body.message : 'Erro ao excluir');
      return;
    }
    setOpen(false);
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setError(null); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/10 text-destructive">
              <TriangleAlert className="h-4 w-4" />
            </span>
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
          Esta ação é permanente e não pode ser desfeita.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {busy ? 'Excluindo…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
