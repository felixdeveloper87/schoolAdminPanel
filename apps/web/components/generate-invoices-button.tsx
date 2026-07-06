'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function GenerateInvoicesButton({ competence }: { competence: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-xs text-muted-foreground">{message}</span>}
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          const res = await fetch(`/api/invoices/generate?competence=${competence}`, { method: 'POST' });
          setBusy(false);
          if (res.ok) {
            const data = await res.json();
            setMessage(
              data.generated > 0
                ? `${data.generated} mensalidade(s) gerada(s)`
                : 'Nenhuma nova — mês já gerado',
            );
            router.refresh();
          } else {
            setMessage('Erro ao gerar');
          }
        }}
      >
        {busy ? 'Gerando…' : 'Gerar mensalidades do mês'}
      </Button>
    </div>
  );
}
