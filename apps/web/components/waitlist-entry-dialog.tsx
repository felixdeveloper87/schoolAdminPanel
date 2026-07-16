'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWaitlistEntrySchema, CreateWaitlistEntryInput, AGE_GROUPS, AGE_GROUP_LABELS, SHIFTS, SHIFT_LABELS } from '@escola/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function WaitlistEntryDialog({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWaitlistEntryInput>({
    resolver: zodResolver(createWaitlistEntrySchema),
    defaultValues: { desiredAgeGroup: 'INTEGRAL_1', desiredShift: 'FULL_DAY' },
  });

  const onSubmit = async (data: CreateWaitlistEntryInput) => {
    setServerError(null);
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setServerError('Erro ao salvar');
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
          <DialogTitle>Nova entrada na lista de espera</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="col-span-2 space-y-1.5">
              <Label>Nome da criança</Label>
              <Input {...register('childName')} />
              {errors.childName && <p className="text-xs text-destructive">{errors.childName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Data de nascimento</Label>
              <Input type="date" {...register('birthDate')} />
              {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Faixa etária desejada</Label>
              <Select {...register('desiredAgeGroup')}>
                {AGE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {AGE_GROUP_LABELS[g]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Turno desejado</Label>
              <Select {...register('desiredShift')}>
                {SHIFTS.map((s) => (
                  <option key={s} value={s}>
                    {SHIFT_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nome do responsável</Label>
              <Input {...register('guardianName')} />
              {errors.guardianName && <p className="text-xs text-destructive">{errors.guardianName.message}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>WhatsApp (com DDD, só números)</Label>
              <Input placeholder="21999998888" {...register('phoneWhatsapp')} />
              {errors.phoneWhatsapp && (
                <p className="text-xs text-destructive">{errors.phoneWhatsapp.message}</p>
              )}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Observações (opcional)</Label>
              <Textarea {...register('notes')} />
            </div>
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
