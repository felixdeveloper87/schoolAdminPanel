import { PrismaClient, EnrollmentType, AgeGroup, Shift, Relationship, DiscountReason } from '@prisma/client';

const prisma = new PrismaClient();

const utcDate = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const subMonths = (date: Date, delta: number) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - delta, 1));
const dueDateFor = (competence: Date, dueDay: number) =>
  new Date(Date.UTC(competence.getUTCFullYear(), competence.getUTCMonth(), dueDay));
const pick = <T>(arr: readonly T[], i: number) => arr[i % arr.length];
const chance = (p: number) => Math.random() < p;

// ---------------------------------------------------------------------------
// Mensalidade fixa por categoria — integral é sempre a mais cara (spec)
// ---------------------------------------------------------------------------
const MONTHLY_FEE_BY_TYPE: Record<EnrollmentType, number> = {
  FULL_TIME: 180000, // R$ 1.800,00
  HALF_DAY_MORNING: 110000, // R$ 1.100,00
  HALF_DAY_AFTERNOON: 110000, // R$ 1.100,00
};
const ENROLLMENT_FEE_CENTS = 45000; // R$ 450,00

const FIRST_NAMES_F = [
  'Alice', 'Sophia', 'Helena', 'Valentina', 'Laura', 'Isabella', 'Manuela', 'Júlia',
  'Heloísa', 'Luísa', 'Cecília', 'Eloá', 'Antonella', 'Liz', 'Sarah', 'Isadora',
  'Beatriz', 'Yasmin', 'Lívia', 'Maria Clara',
] as const;
const FIRST_NAMES_M = [
  'Miguel', 'Arthur', 'Heitor', 'Davi', 'Bernardo', 'Noah', 'Gael', 'Théo',
  'Pedro', 'Enzo', 'Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Vicente', 'Anthony',
  'Lorenzo', 'Bryan', 'Nicolas', 'Samuel',
] as const;
const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira',
  'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes',
  'Soares', 'Fernandes', 'Vieira', 'Barbosa',
] as const;
const GUARDIAN_FIRST_F = [
  'Juliana', 'Fernanda', 'Patrícia', 'Camila', 'Renata', 'Luciana', 'Vanessa', 'Aline',
  'Bruna', 'Carolina', 'Débora', 'Elaine', 'Simone', 'Tatiane', 'Adriana', 'Priscila',
] as const;
const GUARDIAN_FIRST_M = [
  'Marcos', 'Ricardo', 'André', 'Rodrigo', 'Fábio', 'Eduardo', 'Paulo', 'Sérgio',
  'Cláudio', 'Fernando', 'Gustavo', 'Diego', 'Leandro', 'Thiago', 'Alexandre', 'Renato',
] as const;
const ALLERGIES = ['Amendoim', 'Lactose', 'Glúten', 'Ovo', 'Frutos do mar'] as const;

interface ClassroomPlan {
  name: string;
  ageGroup: AgeGroup;
  shift: Shift;
  capacity: number;
  enrollmentType: EnrollmentType;
  count: number;
  birthYear: number;
}

// 6 turmas somando 64 vagas — 50 alunos ativos deixam espaço de ocupação real.
// Turno determina a categoria de matrícula (e portanto a mensalidade fixa da turma).
const CLASSROOMS_PLAN: ClassroomPlan[] = [
  { name: 'Berçário 1 — Manhã', ageGroup: 'BERCARIO_1', shift: 'MORNING', capacity: 8, enrollmentType: 'HALF_DAY_MORNING', count: 8, birthYear: 2025 },
  { name: 'Berçário 2 — Integral', ageGroup: 'BERCARIO_2', shift: 'FULL_DAY', capacity: 10, enrollmentType: 'FULL_TIME', count: 9, birthYear: 2024 },
  { name: 'Maternal 1 — Integral', ageGroup: 'MATERNAL_1', shift: 'FULL_DAY', capacity: 12, enrollmentType: 'FULL_TIME', count: 10, birthYear: 2023 },
  { name: 'Maternal 2 — Tarde', ageGroup: 'MATERNAL_2', shift: 'AFTERNOON', capacity: 12, enrollmentType: 'HALF_DAY_AFTERNOON', count: 9, birthYear: 2022 },
  { name: 'Pré 1 — Manhã', ageGroup: 'PRE_1', shift: 'MORNING', capacity: 12, enrollmentType: 'HALF_DAY_MORNING', count: 8, birthYear: 2021 },
  { name: 'Pré 2 — Integral', ageGroup: 'PRE_2', shift: 'FULL_DAY', capacity: 10, enrollmentType: 'FULL_TIME', count: 6, birthYear: 2020 },
];

const DUE_DAYS = [5, 10, 15, 20, 25] as const;

// Em produção, passe SEED_SCHOOL_ID=<id da escola real> pra popular alunos de
// teste na escola já existente em vez de criar uma "seed-school" separada.
const SEED_SCHOOL_ID = process.env.SEED_SCHOOL_ID ?? 'seed-school';

async function main() {
  const school = await prisma.school.upsert({
    where: { id: SEED_SCHOOL_ID },
    update: {},
    create: {
      id: SEED_SCHOOL_ID,
      name: 'Peniel Christian School',
      cnpj: '12345678000190',
      phone: '21999990000',
      address: 'Rua das Acácias, 123 — Tijuca, Rio de Janeiro/RJ',
    },
  });
  const schoolId = school.id;

  // Usuários reais são criados via POST /api/users (ADMIN) — nunca tocados pelo seed.

  console.log('Limpando dados de exemplo anteriores (alunos, turmas, mensalidades, despesas)...');
  await prisma.tuitionInvoice.deleteMany({ where: { schoolId } });
  await prisma.enrollment.deleteMany({ where: { schoolId } });
  await prisma.guardian.deleteMany({ where: { schoolId } });
  await prisma.student.deleteMany({ where: { schoolId } });
  await prisma.waitlistEntry.deleteMany({ where: { schoolId } });
  await prisma.expense.deleteMany({ where: { schoolId } });
  await prisma.goal.deleteMany({ where: { schoolId } });
  await prisma.classroom.deleteMany({ where: { schoolId } });
  await prisma.expenseCategory.deleteMany({ where: { schoolId } });

  // ---------------------------------------------------------------------------
  // Categorias de despesa
  // ---------------------------------------------------------------------------
  const categoryNames = [
    ['Salários', '#2B4C9B'],
    ['Alimentação', '#3E7C59'],
    ['Aluguel', '#D9534F'],
    ['Material pedagógico', '#F2B33D'],
    ['Limpeza e manutenção', '#5B6B78'],
    ['Contas (água/luz/internet)', '#7C5CBF'],
    ['Impostos e taxas', '#B8552F'],
    ['Outros', '#8A8F98'],
  ] as const;
  for (const [name, colorHex] of categoryNames) {
    await prisma.expenseCategory.create({ data: { schoolId, name, colorHex } });
  }
  const categories = await prisma.expenseCategory.findMany({ where: { schoolId } });
  const cat = (name: string) => categories.find((c) => c.name.startsWith(name))!.id;

  // ---------------------------------------------------------------------------
  // Turmas
  // ---------------------------------------------------------------------------
  const classrooms = [] as { id: string }[];
  for (const c of CLASSROOMS_PLAN) {
    classrooms.push(
      await prisma.classroom.create({
        data: { schoolId, name: c.name, ageGroup: c.ageGroup, shift: c.shift, capacity: c.capacity },
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Competências dos últimos 6 meses (do mais antigo ao atual) e "hoje"
  // ---------------------------------------------------------------------------
  const now = new Date();
  const currentCompetence = utcDate(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const competences = Array.from({ length: 6 }, (_, i) => subMonths(currentCompetence, 5 - i));
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
  const enrollmentStart = competences[0]; // matrículas começam no 1º dos 6 meses — todas têm histórico completo

  // ---------------------------------------------------------------------------
  // 40 alunos distribuídos pelas turmas, com 3 pares de irmãos (desconto SIBLING)
  // ---------------------------------------------------------------------------
  const SIBLING_PAIRS = new Set([3, 12, 27]); // índice do 2º irmão de cada par (usa o guardião do índice-1)

  let index = 0;
  const guardianByIndex = new Map<number, { fullName: string; relationship: Relationship; phone: string }>();

  for (const plan of CLASSROOMS_PLAN) {
    const classroom = classrooms[CLASSROOMS_PLAN.indexOf(plan)];

    for (let n = 0; n < plan.count; n++) {
      const isFemale = index % 2 === 0;
      const firstName = isFemale ? pick(FIRST_NAMES_F, index) : pick(FIRST_NAMES_M, index);
      const lastName = pick(LAST_NAMES, index * 3 + 1);
      const fullName = `${firstName} ${lastName}`;
      const birthDate = utcDate(plan.birthYear, ((index * 5) % 12) + 1, ((index * 7) % 27) + 1);

      let guardian: { fullName: string; relationship: Relationship; phone: string };
      let discountReason: DiscountReason = 'NONE';
      let discountCents = 0;

      if (SIBLING_PAIRS.has(index)) {
        guardian = guardianByIndex.get(index - 1)!;
        discountReason = 'SIBLING';
        discountCents = Math.round(MONTHLY_FEE_BY_TYPE[plan.enrollmentType] * 0.1);
      } else {
        const guardianIsFemale = index % 3 !== 0; // maioria mães, alguns pais
        guardian = {
          fullName: guardianIsFemale
            ? `${pick(GUARDIAN_FIRST_F, index)} ${lastName}`
            : `${pick(GUARDIAN_FIRST_M, index)} ${lastName}`,
          relationship: guardianIsFemale ? 'MAE' : 'PAI',
          phone: `2199${String(9000000 + index * 37).padStart(7, '0')}`,
        };
      }
      guardianByIndex.set(index, guardian);

      const allergies = chance(0.15) ? pick(ALLERGIES, index) : null;
      const dueDay = pick(DUE_DAYS, index);

      const student = await prisma.student.create({
        data: {
          schoolId,
          fullName,
          birthDate,
          enrollmentType: plan.enrollmentType,
          mealsIncluded: plan.enrollmentType === 'FULL_TIME',
          allergies,
          guardians: {
            create: [
              {
                schoolId,
                fullName: guardian.fullName,
                relationship: guardian.relationship,
                phoneWhatsapp: guardian.phone,
                isFinancialResponsible: true,
                authorizedPickup: true,
              },
            ],
          },
        },
      });

      const enrollment = await prisma.enrollment.create({
        data: {
          schoolId,
          studentId: student.id,
          classroomId: classroom.id,
          startDate: enrollmentStart,
          monthlyFeeCents: MONTHLY_FEE_BY_TYPE[plan.enrollmentType],
          discountCents,
          discountReason,
          dueDay,
          enrollmentFeeCents: ENROLLMENT_FEE_CENTS,
        },
      });

      // -----------------------------------------------------------------------
      // Mensalidades dos últimos 6 meses — histórico consistente por competência
      // -----------------------------------------------------------------------
      for (const [ci, competence] of competences.entries()) {
        const isCurrentMonth = ci === competences.length - 1;
        const dueDate = dueDateFor(competence, dueDay);
        const amountCents = MONTHLY_FEE_BY_TYPE[plan.enrollmentType];

        let status: 'PAID' | 'PENDING' | 'OVERDUE' | 'EXEMPT';
        if (!isCurrentMonth) {
          // meses fechados: taxa de inadimplência baixa e realista (~8% ao mês)
          status = chance(0.92) ? 'PAID' : chance(0.75) ? 'OVERDUE' : 'EXEMPT';
        } else if (dueDate < today) {
          // vencimento do mês atual já passou
          status = chance(0.75) ? 'PAID' : 'OVERDUE';
        } else {
          // vencimento do mês atual ainda não chegou
          status = chance(0.4) ? 'PAID' : 'PENDING';
        }

        await prisma.tuitionInvoice.create({
          data: {
            schoolId,
            enrollmentId: enrollment.id,
            competence,
            amountCents,
            discountCents,
            dueDate,
            status,
            paidAt: status === 'PAID' ? dueDate : null,
            paymentMethod: status === 'PAID' ? (chance(0.85) ? 'PIX' : chance(0.5) ? 'CASH' : 'TRANSFER') : null,
            receiptNote: status === 'PAID' ? 'Comprovante no WhatsApp' : null,
          },
        });
      }

      index += 1;
    }
  }

  console.log(`${index} alunos criados em ${classrooms.length} turmas, com 6 meses de mensalidades cada.`);

  // ---------------------------------------------------------------------------
  // Despesas dos últimos 6 meses — fixas recorrentes + variáveis com leve oscilação
  // ---------------------------------------------------------------------------
  for (const competence of competences) {
    const y = competence.getUTCFullYear();
    const m = competence.getUTCMonth() + 1;
    const vary = (base: number, pct: number) => Math.round(base * (1 + (Math.random() * 2 - 1) * pct));

    await prisma.expense.create({
      data: { schoolId, categoryId: cat('Salários'), description: `Folha de pagamento ${m}/${y}`, amountCents: 2800000, expenseDate: utcDate(y, m, 5), recurring: true },
    });
    await prisma.expense.create({
      data: { schoolId, categoryId: cat('Aluguel'), description: `Aluguel do imóvel — ${m}/${y}`, amountCents: 650000, expenseDate: utcDate(y, m, 10), recurring: true },
    });
    await prisma.expense.create({
      data: { schoolId, categoryId: cat('Alimentação'), description: `Hortifruti e mercado — ${m}/${y}`, amountCents: vary(320000, 0.15), expenseDate: utcDate(y, m, 18), recurring: false },
    });
    await prisma.expense.create({
      data: { schoolId, categoryId: cat('Contas'), description: `Água, luz e internet — ${m}/${y}`, amountCents: vary(90000, 0.1), expenseDate: utcDate(y, m, 20), recurring: true },
    });
    await prisma.expense.create({
      data: { schoolId, categoryId: cat('Limpeza'), description: `Material de limpeza — ${m}/${y}`, amountCents: vary(120000, 0.2), expenseDate: utcDate(y, m, 12), recurring: false },
    });
    if (chance(0.5)) {
      await prisma.expense.create({
        data: { schoolId, categoryId: cat('Material pedagógico'), description: `Material pedagógico — ${m}/${y}`, amountCents: vary(80000, 0.3), expenseDate: utcDate(y, m, 8), recurring: false },
      });
    }
    if (m % 3 === 0) {
      await prisma.expense.create({
        data: { schoolId, categoryId: cat('Impostos'), description: `Impostos e taxas — trimestre`, amountCents: 150000, expenseDate: utcDate(y, m, 15), recurring: false },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Metas dos últimos 3 meses
  // ---------------------------------------------------------------------------
  for (const competence of competences.slice(-3)) {
    await prisma.goal.create({
      data: {
        schoolId,
        month: competence,
        newStudentsTarget: 2 + (competence.getUTCMonth() % 3),
        revenueTargetCents: 5800000,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Lista de espera
  // ---------------------------------------------------------------------------
  await prisma.waitlistEntry.createMany({
    data: [
      { schoolId, childName: 'Manuela Freitas', birthDate: utcDate(2025, 4, 10), guardianName: 'Camila Freitas', phoneWhatsapp: '21977770001', desiredAgeGroup: 'BERCARIO_2', desiredShift: 'FULL_DAY', status: 'WAITING' },
      { schoolId, childName: 'Otávio Mendes', birthDate: utcDate(2023, 10, 2), guardianName: 'Paulo Mendes', phoneWhatsapp: '21977770002', desiredAgeGroup: 'MATERNAL_1', desiredShift: 'MORNING', status: 'WAITING' },
      { schoolId, childName: 'Beatriz Nogueira', birthDate: utcDate(2022, 6, 15), guardianName: 'Sandra Nogueira', phoneWhatsapp: '21977770003', desiredAgeGroup: 'MATERNAL_2', desiredShift: 'AFTERNOON', status: 'CONTACTED' },
      { schoolId, childName: 'Caio Monteiro', birthDate: utcDate(2021, 3, 22), guardianName: 'Felipe Monteiro', phoneWhatsapp: '21977770004', desiredAgeGroup: 'PRE_1', desiredShift: 'MORNING', status: 'WAITING' },
      { schoolId, childName: 'Larissa Campos', birthDate: utcDate(2024, 1, 5), guardianName: 'Michele Campos', phoneWhatsapp: '21977770005', desiredAgeGroup: 'BERCARIO_2', desiredShift: 'FULL_DAY', status: 'GAVE_UP' },
    ],
  });

  console.log('Seed concluído: escola, 6 turmas, 40 alunos, 6 meses de mensalidades e despesas, metas e lista de espera.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
