'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createExpenseSchema } from '@escola/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { todayDateInput } from '@/lib/format';

const formSchema = createExpenseSchema.omit({ amountCents: true }).extend({
  amount: z.string().min(1, 'Informe o valor'),
});
type FormValues = z.infer<typeof formSchema>;

const toCents = (value: string) =>
  Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100) || 0;

export function ExpenseDialog({
  categories,
  trigger,
}: {
  categories: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: '',
      description: '',
      amount: '',
      expenseDate: todayDateInput(),
      recurring: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const { amount, ...rest } = data;
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, amountCents: toCents(amount) }),
    });
    if (!res.ok) {
      setServerError('Erro ao salvar despesa');
      return;
    }
    reset();
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova despesa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select {...register('categoryId')}>
              <option value="">Escolha…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input placeholder="ex.: Compra de material de limpeza" {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input inputMode="decimal" placeholder="150,00" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" {...register('expenseDate')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fornecedor (opcional)</Label>
            <Input {...register('supplier')} />
          </div>
          <div className="flex items-center gap-2">
            <input id="recurring" type="checkbox" className="h-4 w-4" {...register('recurring')} />
            <Label htmlFor="recurring">Despesa recorrente (todo mês)</Label>
          </div>
          {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Salvar despesa
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteExpenseButton({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={busy}
      onClick={async () => {
        if (!confirm('Excluir esta despesa?')) return;
        setBusy(true);
        await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
        setBusy(false);
        router.refresh();
      }}
    >
      Excluir
    </Button>
  );
}
