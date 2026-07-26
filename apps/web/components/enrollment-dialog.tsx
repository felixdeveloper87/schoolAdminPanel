'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarDays, CircleDollarSign, GraduationCap, ReceiptText, Sparkles } from 'lucide-react';
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
const formSchema = createEnrollmentSchema.omit({ studentId: true, monthlyFeeCents: true, discountCents: true, enrollmentFeeCents: true, materialFeeCents: true }).extend({
  monthlyFee: z.string().min(1, 'Informe o valor'),
  discount: z.string().default('0'),
  enrollmentFee: z.string().default('0'),
  materialFee: z.string().default('0'),
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
      materialFee: '0',
      enrollmentFeeInstallments: 1,
      materialInstallments: 1,
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
  const enrollmentFeeCents = toCents(watch('enrollmentFee'));
  const materialFeeCents = toCents(watch('materialFee'));
  const enrollmentFeeInstallments = Number(watch('enrollmentFeeInstallments')) || 1;
  const materialInstallments = Number(watch('materialInstallments')) || 1;
  const firstInstallment = (total: number, installments: number) => Math.ceil(total / installments);
  const firstMonthCharges =
    effective + firstInstallment(enrollmentFeeCents, enrollmentFeeInstallments) + firstInstallment(materialFeeCents, materialInstallments);

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
        enrollmentFeeInstallments: Number(data.enrollmentFeeInstallments),
        materialFeeCents: toCents(data.materialFee),
        materialInstallments: Number(data.materialInstallments),
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
      <DialogContent className="max-w-3xl gap-0 overflow-hidden rounded-[24px] border-border p-0">
        <DialogHeader className="relative overflow-hidden border-b border-border bg-gradient-to-br from-[#192d55] via-[#233e70] to-brand px-6 py-6 text-white sm:px-8">
          <span aria-hidden="true" className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/10 blur-xl" />
          <div className="relative flex items-start gap-3 pr-7">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-white shadow-inner"><GraduationCap className="h-5 w-5" /></span>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/65">Cadastro escolar</p>
              <DialogTitle className="mt-1 text-2xl text-white">Nova matrícula</DialogTitle>
              <DialogDescription className="mt-1 text-white/75">Complete os dados de <strong className="text-white">{studentName}</strong>. As cobranças são geradas automaticamente.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[calc(90vh-166px)] overflow-y-auto px-5 py-5 sm:px-8">
        {siblingHint && (
          <p className="mb-4 flex gap-2 rounded-xl border border-accent/35 bg-accent/10 px-3.5 py-3 text-sm text-foreground"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" />{siblingHint}</p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-brand"><GraduationCap className="h-4 w-4" /></span><div><h3 className="text-sm font-extrabold">Turma e período</h3><p className="text-xs text-muted-foreground">Defina onde e quando o aluno começa.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2"><Label>Turma</Label><Select {...register('classroomId')}><option value="">Escolha a turma…</option>{classrooms.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.activeCount} de {c.capacity} vagas ocupadas</option>)}</Select>{errors.classroomId && <p className="text-xs text-destructive">{errors.classroomId.message}</p>}</div>
              <div className="space-y-1.5"><Label>Início</Label><Input type="date" {...register('startDate')} /></div>
              <div className="space-y-1.5"><Label>Vencimento mensal</Label><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" type="number" min={1} max={28} {...register('dueDay', { valueAsNumber: true })} /></div><p className="text-[11px] text-muted-foreground">Dia 1 a 28</p>{errors.dueDay && <p className="text-xs text-destructive">{errors.dueDay.message}</p>}</div>
            </div>
          </section>

          <section className="rounded-2xl border border-brand/20 bg-brand/[0.035] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-brand"><CircleDollarSign className="h-4 w-4" /></span><div><h3 className="text-sm font-extrabold">Mensalidade</h3><p className="text-xs text-muted-foreground">O valor recorrente do aluno.</p></div></div>
            <div className="grid gap-3 sm:grid-cols-3"><div className="space-y-1.5"><Label>Valor mensal (R$)</Label><Input inputMode="decimal" placeholder="1.650,00" {...register('monthlyFee')} />{errors.monthlyFee && <p className="text-xs text-destructive">{errors.monthlyFee.message}</p>}</div><div className="space-y-1.5"><Label>Desconto (R$)</Label><Input inputMode="decimal" placeholder="0,00" {...register('discount')} /></div><div className="space-y-1.5"><Label>Motivo</Label><Select {...register('discountReason')}>{DISCOUNT_REASONS.map((r) => <option key={r} value={r}>{DISCOUNT_REASON_LABELS[r]}</option>)}</Select></div></div>
            <p className="mt-3 rounded-xl bg-card px-3 py-2 text-sm text-muted-foreground">Mensalidade efetiva: <span className="money font-extrabold text-foreground">{brl(Math.max(effective, 0))}</span></p>
          </section>

          <section className="rounded-2xl border border-accent/35 bg-accent/10 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-accent/20 text-accent-deep"><ReceiptText className="h-4 w-4" /></span><div><h3 className="text-sm font-extrabold">Cobranças de entrada <span className="font-normal text-muted-foreground">(opcional)</span></h3><p className="text-xs text-muted-foreground">Taxa e material são separados da mensalidade e podem ser parcelados.</p></div></div>
            <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Taxa de matrícula (R$)</Label><Input inputMode="decimal" placeholder="Ex.: 450,00" {...register('enrollmentFee')} /></div><div className="space-y-1.5"><Label>Parcelar taxa</Label><Select {...register('enrollmentFeeInstallments', { valueAsNumber: true })}><option value="1">À vista</option><option value="2">2x mensais</option><option value="3">3x mensais</option></Select></div><div className="space-y-1.5"><Label>Material didático (R$)</Label><Input inputMode="decimal" placeholder="Ex.: 650,00" {...register('materialFee')} /></div><div className="space-y-1.5"><Label>Parcelar material</Label><Select {...register('materialInstallments', { valueAsNumber: true })}><option value="1">À vista</option><option value="2">2x mensais</option><option value="3">3x mensais</option></Select></div></div>
          </section>

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
          <section className="rounded-2xl bg-[#192d55] p-4 text-white shadow-[0_12px_25px_rgba(25,45,85,.16)]">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/60">Resumo da matrícula</p>
            <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
              <p className="text-white/75">Mensalidade mensal <strong className="money float-right text-white">{brl(Math.max(effective, 0))}</strong></p>
              <p className="text-white/75">Primeira cobrança <strong className="money float-right text-white">{brl(Math.max(firstMonthCharges, 0))}</strong></p>
            </div>
            {(enrollmentFeeCents > 0 || materialFeeCents > 0) && (
              <p className="mt-2 border-t border-white/15 pt-2 text-xs text-white/65">
                Inclui {enrollmentFeeCents > 0 ? `taxa ${enrollmentFeeInstallments}x` : ''}{enrollmentFeeCents > 0 && materialFeeCents > 0 ? ' e ' : ''}{materialFeeCents > 0 ? `material ${materialInstallments}x` : ''}. Parcelas seguintes vencem mensalmente.
              </p>
            )}
          </section>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="sm:min-w-36">
              {isSubmitting ? 'Matriculando…' : 'Matricular'}
            </Button>
          </div>
        </form>
        </div>
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
