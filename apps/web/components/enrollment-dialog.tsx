'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createEnrollmentSchema,
  DISCOUNT_REASONS,
  DISCOUNT_REASON_LABELS,
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
import { todayDateInput, brl } from '@/lib/format';

// No formulário os valores são digitados em reais e convertidos para centavos no submit
const formSchema = createEnrollmentSchema.omit({ studentId: true, monthlyFeeCents: true, discountCents: true, enrollmentFeeCents: true }).extend({
  monthlyFee: z.string().min(1, 'Informe o valor'),
  discount: z.string().default('0'),
  enrollmentFee: z.string().default('0'),
});
type FormValues = z.infer<typeof formSchema>;

const toCents = (value: string) => Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100) || 0;

export function EnrollmentDialog({
  studentId,
  studentName,
  classrooms,
}: {
  studentId: string;
  studentName: string;
  classrooms: { id: string; name: string; activeCount: number; capacity: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [siblingHint, setSiblingHint] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classroomId: '',
      startDate: todayDateInput(),
      monthlyFee: '',
      discount: '0',
      enrollmentFee: '0',
      discountReason: 'NONE',
      dueDay: 5,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    // Sugestão de desconto de irmãos (spec, seção 6)
    fetch(`/api/enrollments/sibling-check?studentId=${studentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.hasSibling) {
          setSiblingHint(
            `Irmão(ã) detectado(a): ${data.siblingName}. Sugestão de desconto de ${data.suggestedDiscountPercent}% (editável).`,
          );
          setValue('discountReason', 'SIBLING');
        }
      })
      .catch(() => null);
  }, [open, studentId, setValue]);

  const monthlyFee = watch('monthlyFee');
  const discount = watch('discount');
  const effective = toCents(monthlyFee) - toCents(discount);

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const res = await fetch('/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId,
        classroomId: data.classroomId,
        startDate: data.startDate,
        monthlyFeeCents: toCents(data.monthlyFee),
        discountCents: toCents(data.discount),
        discountReason: data.discountReason,
        dueDay: Number(data.dueDay),
        enrollmentFeeCents: toCents(data.enrollmentFee),
        notes: data.notes,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setServerError(typeof body?.message === 'string' ? body.message : 'Erro ao matricular');
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Nova matrícula</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova matrícula</DialogTitle>
          <DialogDescription>{studentName}</DialogDescription>
        </DialogHeader>
        {siblingHint && (
          <p className="rounded-md bg-accent/20 px-3 py-2 text-sm">{siblingHint}</p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label>Turma</Label>
            <Select {...register('classroomId')}>
              <option value="">Escolha a turma…</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.activeCount}/{c.capacity})
                </option>
              ))}
            </Select>
            {errors.classroomId && <p className="text-xs text-destructive">{errors.classroomId.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="date" {...register('startDate')} />
            </div>
            <div className="space-y-1.5">
              <Label>Dia de vencimento (1–28)</Label>
              <Input type="number" min={1} max={28} {...register('dueDay', { valueAsNumber: true })} />
              {errors.dueDay && <p className="text-xs text-destructive">{errors.dueDay.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Mensalidade (R$)</Label>
              <Input inputMode="decimal" placeholder="1650,00" {...register('monthlyFee')} />
              {errors.monthlyFee && <p className="text-xs text-destructive">{errors.monthlyFee.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Desconto (R$)</Label>
              <Input inputMode="decimal" placeholder="0,00" {...register('discount')} />
            </div>
            <div className="space-y-1.5">
              <Label>Motivo do desconto</Label>
              <Select {...register('discountReason')}>
                {DISCOUNT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {DISCOUNT_REASON_LABELS[r]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Taxa de matrícula (R$)</Label>
              <Input inputMode="decimal" placeholder="450,00" {...register('enrollmentFee')} />
            </div>
          </div>
          {effective > 0 && (
            <p className="text-sm text-muted-foreground">
              Valor efetivo da mensalidade: <span className="money font-semibold text-foreground">{brl(effective)}</span>
            </p>
          )}
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Matriculando…' : 'Matricular'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EndEnrollmentButton({ enrollmentId }: { enrollmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [endDate, setEndDate] = React.useState(todayDateInput());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Encerrar matrícula
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar matrícula</DialogTitle>
          <DialogDescription>
            A matrícula ficará com status Encerrada e não gera mais mensalidades.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Data de encerramento</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await fetch(`/api/enrollments/${enrollmentId}/end`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endDate, status: 'ENDED' }),
              });
              setBusy(false);
              if (res.ok) {
                setOpen(false);
                router.refresh();
              }
            }}
          >
            Encerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
