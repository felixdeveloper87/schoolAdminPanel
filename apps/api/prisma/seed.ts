import { PrismaClient, EnrollmentType, AgeGroup, Shift, Relationship } from '@prisma/client';

const prisma = new PrismaClient();

const utcDate = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

async function main() {
  const school = await prisma.school.upsert({
    where: { id: 'seed-school' },
    update: {},
    create: {
      id: 'seed-school',
      name: 'Peniel Christian School',
      cnpj: '12345678000190',
      phone: '21999990000',
      address: 'Rua das Acácias, 123 — Tijuca, Rio de Janeiro/RJ',
    },
  });
  const schoolId = school.id;

  // Usuários reais são criados via POST /api/users (ADMIN), não pelo seed —
  // evita recriar contas de teste com senha fraca a cada novo `prisma db seed`.

  // Categorias de despesa (seed inicial da spec)
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
    await prisma.expenseCategory.upsert({
      where: { schoolId_name: { schoolId, name } },
      update: {},
      create: { schoolId, name, colorHex },
    });
  }
  const categories = await prisma.expenseCategory.findMany({ where: { schoolId } });
  const cat = (name: string) => categories.find((c) => c.name.startsWith(name))!.id;

  // Idempotência simples para o resto: se já há turmas, para aqui.
  if ((await prisma.classroom.count({ where: { schoolId } })) > 0) {
    console.log('Seed já aplicado — mantendo dados existentes.');
    return;
  }

  const classroomsData: { name: string; ageGroup: AgeGroup; shift: Shift; capacity: number }[] = [
    { name: 'Berçário 1 — Manhã', ageGroup: 'BERCARIO_1', shift: 'MORNING', capacity: 8 },
    { name: 'Maternal 1 — Integral', ageGroup: 'MATERNAL_1', shift: 'FULL_DAY', capacity: 12 },
    { name: 'Maternal 2 — Integral', ageGroup: 'MATERNAL_2', shift: 'FULL_DAY', capacity: 12 },
    { name: 'Pré 1 — Tarde', ageGroup: 'PRE_1', shift: 'AFTERNOON', capacity: 15 },
  ];
  const classrooms = [] as { id: string; name: string }[];
  for (const c of classroomsData) {
    classrooms.push(await prisma.classroom.create({ data: { schoolId, ...c } }));
  }

  type SeedStudent = {
    fullName: string;
    birth: [number, number, number];
    type: EnrollmentType;
    classroomIdx: number;
    feeCents: number;
    discountCents?: number;
    dueDay: number;
    guardian: { name: string; rel: Relationship; phone: string };
    allergies?: string;
  };

  const students: SeedStudent[] = [
    { fullName: 'Alice Ferreira Lima', birth: [2023, 3, 14], type: 'FULL_TIME', classroomIdx: 1, feeCents: 165000, dueDay: 5, guardian: { name: 'Juliana Ferreira Lima', rel: 'MAE', phone: '21988880001' } },
    { fullName: 'Bernardo Souza Prado', birth: [2023, 7, 2], type: 'FULL_TIME', classroomIdx: 1, feeCents: 165000, discountCents: 16500, dueDay: 10, guardian: { name: 'Marcos Souza Prado', rel: 'PAI', phone: '21988880002' }, allergies: 'Amendoim' },
    { fullName: 'Cecília Prado Souza', birth: [2022, 1, 20], type: 'FULL_TIME', classroomIdx: 2, feeCents: 158000, discountCents: 15800, dueDay: 10, guardian: { name: 'Marcos Souza Prado', rel: 'PAI', phone: '21988880002' } },
    { fullName: 'Davi Oliveira Costa', birth: [2022, 7, 8], type: 'HALF_DAY_AFTERNOON', classroomIdx: 2, feeCents: 98000, dueDay: 15, guardian: { name: 'Renata Oliveira', rel: 'MAE', phone: '21988880004' }, allergies: 'Lactose' },
    { fullName: 'Elisa Martins Rocha', birth: [2021, 11, 25], type: 'HALF_DAY_AFTERNOON', classroomIdx: 3, feeCents: 92000, dueDay: 5, guardian: { name: 'Patrícia Martins', rel: 'MAE', phone: '21988880005' } },
    { fullName: 'Felipe Andrade Nunes', birth: [2021, 7, 30], type: 'HALF_DAY_AFTERNOON', classroomIdx: 3, feeCents: 92000, dueDay: 20, guardian: { name: 'Ricardo Nunes', rel: 'PAI', phone: '21988880006' } },
    { fullName: 'Giovana Ribeiro Alves', birth: [2025, 9, 12], type: 'HALF_DAY_MORNING', classroomIdx: 0, feeCents: 120000, dueDay: 5, guardian: { name: 'Fernanda Ribeiro', rel: 'MAE', phone: '21988880007' } },
    { fullName: 'Heitor Cardoso Melo', birth: [2025, 7, 18], type: 'HALF_DAY_MORNING', classroomIdx: 0, feeCents: 120000, dueDay: 12, guardian: { name: 'Vera Cardoso', rel: 'AVO', phone: '21988880008' } },
    { fullName: 'Isadora Teixeira Ramos', birth: [2022, 12, 3], type: 'FULL_TIME', classroomIdx: 2, feeCents: 158000, dueDay: 8, guardian: { name: 'Luciana Teixeira', rel: 'MAE', phone: '21988880009' } },
    { fullName: 'João Pedro Barros Dias', birth: [2021, 2, 9], type: 'FULL_TIME', classroomIdx: 3, feeCents: 149000, dueDay: 25, guardian: { name: 'André Barros Dias', rel: 'PAI', phone: '21988880010' } },
  ];

  const enrollments: { id: string; feeCents: number; discountCents: number; dueDay: number }[] = [];
  for (const s of students) {
    const student = await prisma.student.create({
      data: {
        schoolId,
        fullName: s.fullName,
        birthDate: utcDate(...s.birth),
        enrollmentType: s.type,
        mealsIncluded: s.type === 'FULL_TIME',
        allergies: s.allergies,
        guardians: {
          create: [
            {
              schoolId,
              fullName: s.guardian.name,
              relationship: s.guardian.rel,
              phoneWhatsapp: s.guardian.phone,
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
        classroomId: classrooms[s.classroomIdx].id,
        startDate: utcDate(2026, 2, 1),
        monthlyFeeCents: s.feeCents,
        discountCents: s.discountCents ?? 0,
        discountReason: s.discountCents ? 'SIBLING' : 'NONE',
        dueDay: s.dueDay,
        enrollmentFeeCents: 45000,
      },
    });
    enrollments.push({ id: enrollment.id, feeCents: s.feeCents, discountCents: s.discountCents ?? 0, dueDay: s.dueDay });
  }

  // Mensalidades: maio (tudo pago), junho (maioria paga, 2 atrasadas), julho (pendentes, 3 pagas)
  const months: { y: number; m: number }[] = [
    { y: 2026, m: 5 },
    { y: 2026, m: 6 },
    { y: 2026, m: 7 },
  ];
  for (const { y, m } of months) {
    for (const [i, e] of enrollments.entries()) {
      const competence = utcDate(y, m, 1);
      const dueDate = utcDate(y, m, e.dueDay);
      let status: 'PAID' | 'PENDING' | 'OVERDUE' = 'PENDING';
      if (m === 5) status = 'PAID';
      if (m === 6) status = i % 5 === 4 ? 'OVERDUE' : 'PAID';
      if (m === 7) status = i < 3 ? 'PAID' : 'PENDING';
      await prisma.tuitionInvoice.create({
        data: {
          schoolId,
          enrollmentId: e.id,
          competence,
          amountCents: e.feeCents,
          discountCents: e.discountCents,
          dueDate,
          status,
          paidAt: status === 'PAID' ? utcDate(y, m, Math.min(e.dueDay, 28)) : null,
          paymentMethod: status === 'PAID' ? 'PIX' : null,
          receiptNote: status === 'PAID' ? 'Comprovante no WhatsApp' : null,
        },
      });
    }
  }

  // Despesas de junho e julho
  const expenses: [string, string, number, [number, number, number], boolean][] = [
    ['Salários', 'Folha de pagamento junho', 1850000, [2026, 6, 5], true],
    ['Aluguel', 'Aluguel do imóvel — junho', 650000, [2026, 6, 10], true],
    ['Alimentação', 'Hortifruti e mercado — junho', 214500, [2026, 6, 18], false],
    ['Contas (água/luz/internet)', 'Luz + internet junho', 87300, [2026, 6, 20], true],
    ['Salários', 'Folha de pagamento julho', 1850000, [2026, 7, 3], true],
    ['Aluguel', 'Aluguel do imóvel — julho', 650000, [2026, 7, 5], true],
    ['Material pedagógico', 'Papelaria e tintas', 63200, [2026, 7, 4], false],
  ];
  for (const [catName, description, amountCents, date, recurring] of expenses) {
    await prisma.expense.create({
      data: {
        schoolId,
        categoryId: cat(catName),
        description,
        amountCents,
        expenseDate: utcDate(...date),
        recurring,
      },
    });
  }

  // Meta e lista de espera
  await prisma.goal.create({
    data: { schoolId, month: utcDate(2026, 7, 1), newStudentsTarget: 3, revenueTargetCents: 1400000 },
  });
  await prisma.waitlistEntry.createMany({
    data: [
      { schoolId, childName: 'Manuela Freitas', birthDate: utcDate(2025, 4, 10), guardianName: 'Camila Freitas', phoneWhatsapp: '21977770001', desiredAgeGroup: 'BERCARIO_2', desiredShift: 'FULL_DAY' },
      { schoolId, childName: 'Otávio Mendes', birthDate: utcDate(2023, 10, 2), guardianName: 'Paulo Mendes', phoneWhatsapp: '21977770002', desiredAgeGroup: 'MATERNAL_1', desiredShift: 'MORNING' },
    ],
  });

  console.log('Seed concluído: escola, turmas, alunos, mensalidades, despesas. Usuários já existentes foram preservados.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
