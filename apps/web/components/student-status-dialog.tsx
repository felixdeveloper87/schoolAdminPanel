'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

export function DeactivateStudentDialog({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    if (reason.trim().length < 3) {
      setError('Informe o motivo do desligamento');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/students/${studentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INACTIVE', reason }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Erro ao desligar aluno');
      return;
    }
    setOpen(false);
    router.push('/alunos?status=INACTIVE');
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <UserX className="h-4 w-4" /> Marcar como ex-aluno
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desligar aluno</DialogTitle>
          <DialogDescription>
            {studentName} sai da lista de alunos ativos e vai para o quadro de ex-alunos. A matrícula
            ativa é encerrada automaticamente (deixa de gerar mensalidade). O histórico é mantido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Motivo do desligamento</Label>
          <Textarea
            placeholder="ex.: mudança de cidade, mudança de escola, inadimplência, conclusão do ciclo…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>
            {busy ? 'Desligando…' : 'Confirmar desligamento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReactivateStudentButton({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  return (
    <Button
      variant="success"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/students/${studentId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' }),
        });
        setBusy(false);
        router.refresh();
      }}
    >
      <UserCheck className="h-4 w-4" /> Reativar aluno
    </Button>
  );
}
