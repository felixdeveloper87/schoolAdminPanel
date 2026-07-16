import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums (espelham os enums do Prisma)
// ---------------------------------------------------------------------------
export const ROLES = ['ADMIN', 'STAFF'] as const;
export type Role = (typeof ROLES)[number];

export const AGE_GROUPS = [
  'INTEGRAL_1',
  'INTEGRAL_2',
  'INTEGRAL_3',
  'MATERNAL_1',
  'MATERNAL_2',
  'PRE_1',
  'PRE_2',
  'ANO_1',
  'ANO_2',
  'ANO_3',
  'ANO_4',
  'ANO_5',
] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const SHIFTS = ['MORNING', 'AFTERNOON', 'FULL_DAY'] as const;
export type Shift = (typeof SHIFTS)[number];

export const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE', 'WAITLIST'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const ENROLLMENT_TYPES = ['FULL_TIME', 'HALF_DAY_MORNING', 'HALF_DAY_AFTERNOON'] as const;
export type EnrollmentType = (typeof ENROLLMENT_TYPES)[number];

export const RELATIONSHIPS = ['MAE', 'PAI', 'AVO', 'TIO', 'OUTRO'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const ENROLLMENT_STATUSES = ['ACTIVE', 'ENDED', 'CANCELLED'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const DISCOUNT_REASONS = ['SIBLING', 'SCHOLARSHIP', 'NEGOTIATED', 'NONE'] as const;
export type DiscountReason = (typeof DISCOUNT_REASONS)[number];

export const INVOICE_STATUSES = ['PENDING', 'PAID', 'OVERDUE', 'EXEMPT', 'CANCELLED'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = ['PIX', 'CASH', 'TRANSFER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const WAITLIST_STATUSES = ['WAITING', 'CONTACTED', 'ENROLLED', 'GAVE_UP'] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

// ---------------------------------------------------------------------------
// Labels pt-BR (glossário código ⇄ UI)
// ---------------------------------------------------------------------------
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  STAFF: 'Secretaria',
};

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  INTEGRAL_1: 'Integral I',
  INTEGRAL_2: 'Integral II',
  INTEGRAL_3: 'Integral III',
  MATERNAL_1: 'Maternal I',
  MATERNAL_2: 'Maternal II',
  PRE_1: 'Pré I',
  PRE_2: 'Pré II',
  ANO_1: '1 ano',
  ANO_2: '2 ano',
  ANO_3: '3 ano',
  ANO_4: '4 ano',
  ANO_5: '5 ano',
};

export const SHIFT_LABELS: Record<Shift, string> = {
  MORNING: 'Manhã',
  AFTERNOON: 'Tarde',
  FULL_DAY: 'Integral',
};

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  WAITLIST: 'Lista de espera',
};

export const ENROLLMENT_TYPE_LABELS: Record<EnrollmentType, string> = {
  FULL_TIME: 'Integral',
  HALF_DAY_MORNING: 'Meio período (manhã)',
  HALF_DAY_AFTERNOON: 'Meio período (tarde)',
};

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  MAE: 'Mãe',
  PAI: 'Pai',
  AVO: 'Avó/Avô',
  TIO: 'Tia/Tio',
  OUTRO: 'Outro',
};

export const DISCOUNT_REASON_LABELS: Record<DiscountReason, string> = {
  SIBLING: 'Irmãos',
  SCHOLARSHIP: 'Bolsa',
  NEGOTIATED: 'Negociado',
  NONE: 'Sem desconto',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Atrasada',
  EXEMPT: 'Isenta',
  CANCELLED: 'Cancelada',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'Pix',
  CASH: 'Dinheiro',
  TRANSFER: 'Transferência',
};

export const WAITLIST_STATUS_LABELS: Record<WaitlistStatus, string> = {
  WAITING: 'Aguardando',
  CONTACTED: 'Contatado',
  ENROLLED: 'Matriculado',
  GAVE_UP: 'Desistiu',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use AAAA-MM-DD)');

export const competenceString = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Competência inválida (use AAAA-MM)');

export const cents = z
  .number({ invalid_type_error: 'Informe um valor' })
  .int('Valor deve ser inteiro (centavos)')
  .min(0, 'Valor não pode ser negativo');

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// AppUser (usuário do painel — ADMIN cria/gerencia)
// ---------------------------------------------------------------------------
export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  role: z.enum(ROLES),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

// ---------------------------------------------------------------------------
// Guardian (responsável)
// ---------------------------------------------------------------------------
export const guardianSchema = z.object({
  fullName: z.string().min(2, 'Nome obrigatório'),
  relationship: z.enum(RELATIONSHIPS),
  cpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve ter 11 dígitos (só números)')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  phoneWhatsapp: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone com DDD, só números (10–11 dígitos)'),
  email: z
    .string()
    .email('E-mail inválido')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  isFinancialResponsible: z.boolean().default(false),
  authorizedPickup: z.boolean().default(true),
});
export type GuardianInput = z.infer<typeof guardianSchema>;

// ---------------------------------------------------------------------------
// Student (aluno)
// ---------------------------------------------------------------------------
const studentBase = z.object({
  fullName: z.string().min(2, 'Nome obrigatório'),
  birthDate: dateString,
  enrollmentType: z.enum(ENROLLMENT_TYPES),
  mealsIncluded: z.boolean().default(true),
  allergies: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
  dietaryRestrictions: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
  medicalNotes: z.string().max(1000).optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().max(1000).optional().or(z.literal('').transform(() => undefined)),
});

const exactlyOneFinancial = (guardians: GuardianInput[], ctx: z.RefinementCtx) => {
  const count = guardians.filter((g) => g.isFinancialResponsible).length;
  if (count !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Exatamente um responsável deve ser o responsável financeiro',
      path: [],
    });
  }
};

export const createStudentSchema = studentBase.extend({
  guardians: z.array(guardianSchema).min(1, 'Informe ao menos um responsável').superRefine(exactlyOneFinancial),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = createStudentSchema;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

export const updateStudentStatusSchema = z
  .object({
    status: z.enum(STUDENT_STATUSES),
    reason: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'INACTIVE' && (!data.reason || data.reason.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o motivo do desligamento',
        path: ['reason'],
      });
    }
  });
export type UpdateStudentStatusInput = z.infer<typeof updateStudentStatusSchema>;

// ---------------------------------------------------------------------------
// Classroom (turma)
// ---------------------------------------------------------------------------
export const createClassroomSchema = z.object({
  name: z.string().trim().max(100, 'Máximo de 100 caracteres').optional().or(z.literal('').transform(() => undefined)),
  ageGroup: z.enum(AGE_GROUPS),
  shift: z.enum(SHIFTS),
  capacity: z.number().int().min(1, 'Capacidade mínima 1').max(100),
  active: z.boolean().default(true),
});
export type CreateClassroomInput = z.infer<typeof createClassroomSchema>;

export const updateClassroomSchema = createClassroomSchema;
export type UpdateClassroomInput = z.infer<typeof updateClassroomSchema>;

// ---------------------------------------------------------------------------
// Enrollment (matrícula)
// ---------------------------------------------------------------------------
export const createEnrollmentSchema = z.object({
  studentId: z.string().min(1),
  classroomId: z.string().min(1, 'Escolha a turma'),
  startDate: dateString,
  monthlyFeeCents: cents,
  discountCents: cents.default(0),
  discountReason: z.enum(DISCOUNT_REASONS).default('NONE'),
  dueDay: z.number().int().min(1, 'Entre 1 e 28').max(28, 'Entre 1 e 28'),
  enrollmentFeeCents: cents.default(0),
  notes: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
});
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;

export const endEnrollmentSchema = z.object({
  endDate: dateString,
  status: z.enum(['ENDED', 'CANCELLED']).default('ENDED'),
});
export type EndEnrollmentInput = z.infer<typeof endEnrollmentSchema>;

// ---------------------------------------------------------------------------
// TuitionInvoice (mensalidade)
// ---------------------------------------------------------------------------
export const payInvoiceSchema = z.object({
  method: z.enum(PAYMENT_METHODS).default('PIX'),
  paidAt: dateString,
  receiptNote: z.string().max(300).optional().or(z.literal('').transform(() => undefined)),
});
export type PayInvoiceInput = z.infer<typeof payInvoiceSchema>;

// ---------------------------------------------------------------------------
// Expense (despesa)
// ---------------------------------------------------------------------------
export const createExpenseSchema = z.object({
  categoryId: z.string().min(1, 'Escolha a categoria'),
  description: z.string().min(2, 'Descrição obrigatória'),
  amountCents: cents.refine((v) => v > 0, 'Valor deve ser maior que zero'),
  expenseDate: dateString,
  supplier: z.string().max(200).optional().or(z.literal('').transform(() => undefined)),
  recurring: z.boolean().default(false),
  notes: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const createExpenseCategorySchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;

// ---------------------------------------------------------------------------
// Goal (meta mensal)
// ---------------------------------------------------------------------------
export const upsertGoalSchema = z.object({
  month: competenceString,
  newStudentsTarget: z.number().int().min(0, 'Não pode ser negativo'),
  revenueTargetCents: cents.optional(),
});
export type UpsertGoalInput = z.infer<typeof upsertGoalSchema>;

// ---------------------------------------------------------------------------
// WaitlistEntry (lista de espera)
// ---------------------------------------------------------------------------
export const createWaitlistEntrySchema = z.object({
  childName: z.string().min(2, 'Nome obrigatório'),
  birthDate: dateString,
  guardianName: z.string().min(2, 'Nome obrigatório'),
  phoneWhatsapp: z.string().regex(/^\d{10,11}$/, 'Telefone com DDD, só números (10–11 dígitos)'),
  desiredAgeGroup: z.enum(AGE_GROUPS),
  desiredShift: z.enum(SHIFTS),
  notes: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
});
export type CreateWaitlistEntryInput = z.infer<typeof createWaitlistEntrySchema>;

export const updateWaitlistStatusSchema = z.object({
  status: z.enum(WAITLIST_STATUSES),
});
export type UpdateWaitlistStatusInput = z.infer<typeof updateWaitlistStatusSchema>;

// ---------------------------------------------------------------------------
// Rematrícula em lote
// ---------------------------------------------------------------------------
export const renewBatchSchema = z.object({
  classroomId: z.string().min(1, 'Escolha a turma'),
  targetClassroomId: z.string().min(1, 'Escolha a turma de destino'),
  readjustPercent: z.number().min(-100).max(500),
  newStartDate: dateString,
  chargeEnrollmentFee: z.boolean().default(true),
  overrides: z
    .array(
      z.object({
        enrollmentId: z.string().min(1),
        monthlyFeeCents: cents,
      }),
    )
    .default([]),
});
export type RenewBatchInput = z.infer<typeof renewBatchSchema>;
