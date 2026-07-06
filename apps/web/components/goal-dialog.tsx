'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { upsertGoalSchema } from '@escola/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { currentCompetence } from '@/lib/format';

const formSchema = upsertGoalSchema.omit({ revenueTargetCents: true }).extend({
  revenueTarget: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const toCents = (value?: string) => {
  if (!value) return undefined;
  return Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100) || undefined;
};

export function GoalDialog({
  defaultMonth,
  defaultTarget,
  defaultRevenueCents,
  trigger,
}: {
  defaultMonth?: string;
  defaultTarget?: number;
  defaultRevenueCents?: number | null;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      month: defaultMonth ?? currentCompetence(),
      newStudentsTarget: defaultTarget ?? 0,
      revenueTarget: defaultRevenueCents ? (defaultRevenueCents / 100).toFixed(2).replace('.', ',') : '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        month: data.month,
        newStudentsTarget: Number(data.newStudentsTarget),
        revenueTargetCents: toCents(data.revenueTarget),
      }),
    });
    if (!res.ok) {
      setServerError('Erro ao salvar meta');
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultMonth ? 'Editar meta' : 'Nova meta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label>Mês</Label>
            <Input type="month" {...register('month')} disabled={Boolean(defaultMonth)} />
            {errors.month && <p className="text-xs text-destructive">{errors.month.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Meta de novos alunos</Label>
            <Input type="number" min={0} {...register('newStudentsTarget', { valueAsNumber: true })} />
            {errors.newStudentsTarget && (
              <p className="text-xs text-destructive">{errors.newStudentsTarget.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Meta de faturamento (R$, opcional)</Label>
            <Input inputMode="decimal" placeholder="14000,00" {...register('revenueTarget')} />
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
