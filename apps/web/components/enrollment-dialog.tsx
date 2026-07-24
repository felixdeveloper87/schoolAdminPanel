'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BackfillMode,
  BACKFILL_MODE_LABELS,
  createEnrollmentSchema,
  DISCOUNT_REASONS,
  DISCOUNT_REASON_LABELS,
  MAX_BACKFILL_MONTHS,
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
import { todayDateInput, brl, competenceDiff, currentCompetence, toDateInput } from '@/lib/format';

// No formulário os valores são digitados em reais e convertidos para centavos no submit
const formSchema = createEnrollmentSchema.omit({ studentId: true, monthlyFeeCents: true, discountCents: true, enrollmentFeeCents: true }).extend({
  monthlyFee: z.string().min(1, 'Informe o valor'),
  discount: z.string().default('0'),
  enrollmentFee: z.string().default('0'),
});
type FormValues = z.infer<typeof formSchema>;

const toCents = (value: string) => Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100) || 0;

/** Quantos meses fechados existem entre o início da matrícula e a competência atual. */
const retroactiveMonths = (startDate: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return 0;
  return Math.max(competenceDiff(startDate.slice(0, 7), currentCompetence()), 0);
};

const BACKFILL_OPTIONS: { value: BackfillMode; hint: string }[] = [
  {
    value: 'PAID',
    hint: 'Aluno antigo migrando para a plataforma — o histórico entra quitado e não conta como inadimplência.',
  },
  {
    value: 'OPEN',
    hint: 'A escola ainda vai receber esses meses — entram como atrasadas e aparecem na inadimplência.',
  },
  {
    value: 'NONE',
    hint: 'Só a mensalidade do mês atual é criada. Os meses anteriores ficam fora do sistema.',
  },
];

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
      backfillMode: 'PAID',
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

  const backfillMode = watch('backfillMode');
  const pastMonths = retroactiveMonths(watch('startDate'));
  const backfillTotal = backfillMode === 'NONE' ? 0 : pastMonths * effective;

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
        backfillMode: data.backfillMode,
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
          <div className="grid gap-3 sm:grid-cols-2">
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

          {pastMonths > 0 && (
            <div className="space-y-3 rounded-xl border border-accent/40 bg-accent/10 p-3.5">
              <div>
                <p className="text-sm font-extrabold text-foreground">
                  Início retroativo: {pastMonths} {pastMonths === 1 ? 'mês anterior' : 'meses anteriores'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  A mensalidade do mês atual sempre é criada. Escolha o que fazer com o histórico.
                </p>
              </div>

              <div className="space-y-1.5">
                {BACKFILL_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer gap-2.5 rounded-lg border border-transparent bg-card/70 p-2.5 transition-colors hover:border-border has-[:checked]:border-brand has-[:checked]:bg-card"
                  >
                    <input
                      type="radio"
                      value={option.value}
                      {...register('backfillMode')}
                      className="mt-0.5 h-4 w-4 flex-none accent-brand"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-extrabold text-foreground">{BACKFILL_MODE_LABELS[option.value]}</span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              {backfillTotal > 0 && (
                <p className="text-xs text-muted-foreground">
                  Serão lançados {pastMonths} + 1 lançamentos, somando{' '}
                  <span className="money font-semibold text-foreground">{brl(backfillTotal + effective)}</span>.
                </p>
              )}
              {pastMonths > MAX_BACKFILL_MONTHS && backfillMode !== 'NONE' && (
                <p className="text-xs font-semibold text-destructive">
                  Acima do limite de {MAX_BACKFILL_MONTHS} meses retroativos. Confira a data de início ou escolha “Não gerar”.
                </p>
              )}
            </div>
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

export function EditEnrollmentStartDateButton({
  enrollmentId,
  startDate,
}: {
  enrollmentId: string;
  startDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(toDateInput(startDate));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/enrollments/${enrollmentId}/start-date`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: date }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(typeof body?.message === 'string' ? body.message : 'Não foi possível atualizar a data');
      return;
    }

    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Editar data</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar data da matrícula</DialogTitle>
          <DialogDescription>
            As mensalidades serão recalculadas de acordo com o novo período. Lançamentos fora dele serão excluídos,
            inclusive se já estiverem pagos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="enrollmentStartDate">Data de início</Label>
          <Input
            id="enrollmentStartDate"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={busy || !date} onClick={save}>
            {busy ? 'Salvando…' : 'Salvar e recalcular'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
