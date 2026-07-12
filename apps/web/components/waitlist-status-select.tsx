'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { WAITLIST_STATUSES, WAITLIST_STATUS_LABELS, WaitlistStatus } from '@escola/contracts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';

export function WaitlistStatusSelect({ id, status }: { id: string; status: WaitlistStatus }) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = React.useState(status);
  const [nextStatus, setNextStatus] = React.useState<WaitlistStatus | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedStatus(status);
  }, [status]);

  const cancel = () => {
    setNextStatus(null);
    setSelectedStatus(status);
    setError(null);
  };

  const confirm = async () => {
    if (!nextStatus) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/waitlist/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    setBusy(false);
    if (!response.ok) {
      setError('Não foi possível atualizar o status. Tente novamente.');
      return;
    }
    setNextStatus(null);
    router.refresh();
  };

  return (
    <>
      <Select
        className="h-8 w-40 rounded-lg border-[#dce5ef] bg-white text-xs font-semibold text-[#526178]"
        value={selectedStatus}
        onChange={(event) => {
          const value = event.target.value as WaitlistStatus;
          if (value === status) return;
          setSelectedStatus(value);
          setNextStatus(value);
        }}
      >
        {WAITLIST_STATUSES.map((item) => (
          <option key={item} value={item}>
            {WAITLIST_STATUS_LABELS[item]}
          </option>
        ))}
      </Select>

      <Dialog open={Boolean(nextStatus)} onOpenChange={(open) => !open && cancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar status da entrada?</DialogTitle>
            <DialogDescription>
              O status mudará de <strong>{WAITLIST_STATUS_LABELS[status]}</strong> para{' '}
              <strong>{nextStatus ? WAITLIST_STATUS_LABELS[nextStatus] : ''}</strong>.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirm} disabled={busy}>
              {busy ? 'Atualizando…' : 'Confirmar alteração'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
