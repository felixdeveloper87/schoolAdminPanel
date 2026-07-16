'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createClassroomSchema,
  CreateClassroomInput,
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  SHIFTS,
  SHIFT_LABELS,
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
  DialogTrigger,
} from '@/components/ui/dialog';

interface ClassroomDialogProps {
  classroom?: CreateClassroomInput & { id: string };
  trigger: React.ReactNode;
}

export function ClassroomDialog({ classroom, trigger }: ClassroomDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateClassroomInput>({
    resolver: zodResolver(createClassroomSchema),
    defaultValues: classroom ?? {
      name: '',
      ageGroup: 'INTEGRAL_1',
      shift: 'FULL_DAY',
      capacity: 10,
      active: true,
    },
  });

  const onSubmit = async (data: CreateClassroomInput) => {
    setServerError(null);
    const res = await fetch(classroom ? `/api/classrooms/${classroom.id}` : '/api/classrooms', {
      method: classroom ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setServerError('Erro ao salvar turma');
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
          <DialogTitle>{classroom ? 'Editar turma' : 'Nova turma'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label>Nome da turma (opcional)</Label>
            <Input placeholder="ex.: Maternal 1 — Integral" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Faixa etária</Label>
              <Select {...register('ageGroup')}>
                {AGE_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {AGE_GROUP_LABELS[g]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Turno</Label>
              <Select {...register('shift')}>
                {SHIFTS.map((s) => (
                  <option key={s} value={s}>
                    {SHIFT_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Capacidade</Label>
              <Input type="number" min={1} {...register('capacity', { valueAsNumber: true })} />
              {errors.capacity && <p className="text-xs text-destructive">{errors.capacity.message}</p>}
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id={`active-${classroom?.id ?? 'new'}`} type="checkbox" className="h-4 w-4" {...register('active')} />
              <Label htmlFor={`active-${classroom?.id ?? 'new'}`}>Turma ativa</Label>
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
