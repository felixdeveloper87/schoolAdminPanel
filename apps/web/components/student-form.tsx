'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CircleDollarSign, GraduationCap, Plus, ReceiptText, Trash2 } from 'lucide-react';
import {
  createStudentSchema,
  CreateStudentInput,
  createEnrollmentSchema,
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
import { todayDateInput } from '@/lib/format';

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
  classrooms?: { id: string; name: string; activeCount: number; capacity: number }[];
  onCancel?: () => void;
}

const enrollmentFormSchema = createEnrollmentSchema
  .omit({ studentId: true, monthlyFeeCents: true, discountCents: true, enrollmentFeeCents: true, materialFeeCents: true })
  .extend({
    monthlyFee: z.string().min(1, 'Informe o valor da mensalidade'),
    discount: z.string().default('0'),
    enrollmentFee: z.string().default('0'),
    materialFee: z.string().default('0'),
  });

type EnrollmentFormValues = z.infer<typeof enrollmentFormSchema>;
type StudentFormValues = CreateStudentInput & {
  createEnrollment: boolean;
  enrollment: EnrollmentFormValues;
};

const toCents = (value: string) => Math.round(Number(value.replace(/\./g, '').replace(',', '.')) * 100) || 0;

export function StudentForm({ studentId, defaultValues, currentPhotoUrl, classrooms = [], onCancel }: StudentFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const photoInputRef = React.useRef<StudentPhotoInputHandle>(null);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(createStudentSchema.passthrough()) as never,
    defaultValues: {
      ...(defaultValues ?? {
        fullName: '',
        birthDate: '',
        enrollmentType: 'FULL_TIME',
        mealsIncluded: true,
        guardians: [{ ...emptyGuardian, isFinancialResponsible: true }],
      }),
      createEnrollment: !studentId,
      enrollment: {
        classroomId: '',
        startDate: todayDateInput(),
        monthlyFee: '',
        discount: '0',
        discountReason: 'NONE',
        dueDay: 5,
        enrollmentFee: '0',
        enrollmentFeeInstallments: 1,
        materialFee: '0',
        materialInstallments: 1,
        backfillMode: 'NONE',
      },
    } as StudentFormValues,
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
  const createEnrollment = watch('createEnrollment');

  const onSubmit = async (data: StudentFormValues) => {
    setServerError(null);
    const enrollmentValidation = !studentId && data.createEnrollment
      ? enrollmentFormSchema.safeParse(data.enrollment)
      : null;
    if (enrollmentValidation && !enrollmentValidation.success) {
      setServerError(enrollmentValidation.error.issues[0]?.message ?? 'Revise os dados da matrícula.');
      return;
    }
    const { createEnrollment, enrollment, ...studentData } = data;
    const body = studentId
      ? studentData
      : {
          ...studentData,
          enrollment: createEnrollment && enrollmentValidation?.success
            ? {
                ...enrollmentValidation.data,
                monthlyFeeCents: toCents(enrollmentValidation.data.monthlyFee),
                discountCents: toCents(enrollmentValidation.data.discount),
                enrollmentFeeCents: toCents(enrollmentValidation.data.enrollmentFee),
                materialFeeCents: toCents(enrollmentValidation.data.materialFee),
              }
            : undefined,
        };
    const res = await fetch(studentId ? `/api/students/${studentId}` : '/api/students', {
      method: studentId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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

      {!studentId && (
        <Card className="notebook-card paper-panel" style={{ ['--notebook-accent' as string]: 'var(--brand)' }}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-brand" /> Matrícula inicial</span>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4" {...register('createEnrollment')} /> Matricular agora</label>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {createEnrollment ? (
              <div className="space-y-5">
                <p className="rounded-xl bg-brand/5 px-3 py-2 text-sm text-muted-foreground">A matrícula, a taxa de matrícula, o material e a primeira mensalidade serão criados ao salvar o aluno.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2"><Label>Nova turma</Label><Select {...register('enrollment.classroomId')}><option value="">Escolha a turma…</option>{classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name} · {classroom.activeCount} de {classroom.capacity} vagas ocupadas</option>)}</Select></div>
                  <div className="space-y-1.5"><Label>Início</Label><Input type="date" {...register('enrollment.startDate')} /></div>
                  <div className="space-y-1.5"><Label>Vencimento mensal</Label><Input type="number" min={1} max={28} {...register('enrollment.dueDay', { valueAsNumber: true })} /></div>
                </div>
                <div className="rounded-xl border border-brand/20 bg-brand/[0.035] p-4"><div className="mb-3 flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-brand" /><p className="text-sm font-extrabold">Mensalidade</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Valor mensal (R$)</Label><Input inputMode="decimal" placeholder="1.650,00" {...register('enrollment.monthlyFee')} /></div><div className="space-y-1.5"><Label>Desconto mensal (R$)</Label><Input inputMode="decimal" placeholder="0,00" {...register('enrollment.discount')} /></div></div></div>
                <div className="rounded-xl border border-accent/35 bg-accent/10 p-4"><div className="mb-3 flex items-center gap-2"><ReceiptText className="h-4 w-4 text-accent-deep" /><p className="text-sm font-extrabold">Cobranças de entrada <span className="font-normal text-muted-foreground">(opcional)</span></p></div><div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Taxa de matrícula (R$)</Label><Input inputMode="decimal" placeholder="450,00" {...register('enrollment.enrollmentFee')} /></div><div className="space-y-1.5"><Label>Parcelar taxa</Label><Select {...register('enrollment.enrollmentFeeInstallments', { valueAsNumber: true })}><option value="1">À vista</option><option value="2">2x mensais</option><option value="3">3x mensais</option></Select></div><div className="space-y-1.5"><Label>Material didático (R$)</Label><Input inputMode="decimal" placeholder="650,00" {...register('enrollment.materialFee')} /></div><div className="space-y-1.5"><Label>Parcelar material</Label><Select {...register('enrollment.materialInstallments', { valueAsNumber: true })}><option value="1">À vista</option><option value="2">2x mensais</option><option value="3">3x mensais</option></Select></div></div></div>
              </div>
            ) : <p className="text-sm text-muted-foreground">Você poderá matricular o aluno em uma turma depois, pela ficha dele.</p>}
          </CardContent>
        </Card>
      )}

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
        <Button type="button" variant="outline" onClick={onCancel ?? (() => router.back())}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : studentId ? 'Salvar alterações' : 'Cadastrar aluno'}
        </Button>
      </div>
    </form>
  );
}
