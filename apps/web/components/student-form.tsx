'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import {
  createStudentSchema,
  CreateStudentInput,
  ENROLLMENT_TYPES,
  ENROLLMENT_TYPE_LABELS,
  RELATIONSHIPS,
  RELATIONSHIP_LABELS,
} from '@escola/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentPhotoInput, StudentPhotoInputHandle, uploadStudentPhoto } from '@/components/student-photo-input';

const emptyGuardian = {
  fullName: '',
  relationship: 'MAE' as const,
  cpf: '',
  phoneWhatsapp: '',
  email: '',
  isFinancialResponsible: false,
  authorizedPickup: true,
};

interface StudentFormProps {
  studentId?: string;
  defaultValues?: CreateStudentInput;
  currentPhotoUrl?: string | null;
}

export function StudentForm({ studentId, defaultValues, currentPhotoUrl }: StudentFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const photoInputRef = React.useRef<StudentPhotoInputHandle>(null);

  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: defaultValues ?? {
      fullName: '',
      birthDate: '',
      enrollmentType: 'FULL_TIME',
      mealsIncluded: true,
      guardians: [{ ...emptyGuardian, isFinancialResponsible: true }],
    },
  });
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'guardians' });

  const enrollmentType = watch('enrollmentType');
  React.useEffect(() => {
    // Default da spec: refeição inclusa quando integral
    if (!defaultValues) setValue('mealsIncluded', enrollmentType === 'FULL_TIME');
  }, [enrollmentType, setValue, defaultValues]);

  const guardians = watch('guardians');

  const onSubmit = async (data: CreateStudentInput) => {
    setServerError(null);
    const res = await fetch(studentId ? `/api/students/${studentId}` : '/api/students', {
      method: studentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setServerError(typeof body?.message === 'string' ? body.message : 'Erro ao salvar aluno');
      return;
    }
    const saved = await res.json();

    const photoFile = photoInputRef.current?.getFile();
    if (photoFile) {
      await uploadStudentPhoto(saved.id, photoFile);
    }

    router.push(`/alunos/${saved.id}`);
    router.refresh();
  };

  const guardiansRootError = (errors.guardians as { root?: { message?: string } })?.root?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="notebook-card paper-panel">
        <CardHeader>
          <CardTitle>Dados do aluno</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <StudentPhotoInput ref={photoInputRef} currentPhotoUrl={currentPhotoUrl} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" {...register('fullName')} />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthDate">Data de nascimento</Label>
            <Input id="birthDate" type="date" {...register('birthDate')} />
            {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="enrollmentType">Período</Label>
            <Select id="enrollmentType" {...register('enrollmentType')}>
              {ENROLLMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ENROLLMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input id="mealsIncluded" type="checkbox" className="h-4 w-4" {...register('mealsIncluded')} />
            <Label htmlFor="mealsIncluded">Refeição inclusa</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="notebook-card paper-panel" style={{ ['--notebook-accent' as string]: 'var(--destructive)' }}>
        <CardHeader>
          <CardTitle>Saúde e alimentação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="allergies">Alergias</Label>
            <Input id="allergies" placeholder="ex.: amendoim, picada de abelha" {...register('allergies')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dietaryRestrictions">Restrições alimentares</Label>
            <Input id="dietaryRestrictions" placeholder="ex.: sem lactose" {...register('dietaryRestrictions')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="medicalNotes">Observações médicas</Label>
            <Textarea id="medicalNotes" {...register('medicalNotes')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Observações gerais</Label>
            <Textarea id="notes" {...register('notes')} />
          </div>
        </CardContent>
      </Card>

      <Card className="notebook-card paper-panel" style={{ ['--notebook-accent' as string]: 'var(--accent)' }}>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Responsáveis</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyGuardian)}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {guardiansRootError && <p className="text-sm text-destructive">{guardiansRootError}</p>}
          {fields.map((field, index) => (
            <fieldset key={field.id} className="rounded-lg border bg-muted/25 p-4">
              <div className="mb-3 flex items-center justify-between">
                <legend className="font-display font-semibold">Responsável {index + 1}</legend>
                {fields.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nome completo</Label>
                  <Input {...register(`guardians.${index}.fullName`)} />
                  {errors.guardians?.[index]?.fullName && (
                    <p className="text-xs text-destructive">{errors.guardians[index]?.fullName?.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Parentesco</Label>
                  <Select {...register(`guardians.${index}.relationship`)}>
                    {RELATIONSHIPS.map((r) => (
                      <option key={r} value={r}>
                        {RELATIONSHIP_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp (com DDD, só números)</Label>
                  <Input placeholder="21999998888" {...register(`guardians.${index}.phoneWhatsapp`)} />
                  {errors.guardians?.[index]?.phoneWhatsapp && (
                    <p className="text-xs text-destructive">
                      {errors.guardians[index]?.phoneWhatsapp?.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>CPF (opcional)</Label>
                  <Input placeholder="Só números" {...register(`guardians.${index}.cpf`)} />
                  {errors.guardians?.[index]?.cpf && (
                    <p className="text-xs text-destructive">{errors.guardians[index]?.cpf?.message}</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>E-mail (opcional)</Label>
                  <Input type="email" {...register(`guardians.${index}.email`)} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    className="h-4 w-4"
                    name="financialResponsible"
                    checked={guardians?.[index]?.isFinancialResponsible ?? false}
                    onChange={() => {
                      guardians.forEach((_, i) =>
                        setValue(`guardians.${i}.isFinancialResponsible`, i === index),
                      );
                    }}
                  />
                  <Label>Responsável financeiro</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    {...register(`guardians.${index}.authorizedPickup`)}
                  />
                  <Label>Autorizado a buscar a criança</Label>
                </div>
              </div>
            </fieldset>
          ))}
        </CardContent>
      </Card>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : studentId ? 'Salvar alterações' : 'Cadastrar aluno'}
        </Button>
      </div>
    </form>
  );
}
