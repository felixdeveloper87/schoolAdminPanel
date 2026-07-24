import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  BackfillMode,
  CreateEnrollmentInput,
  EndEnrollmentInput,
  MAX_BACKFILL_MONTHS,
  RenewBatchInput,
  UpdateEnrollmentStartDateInput,
} from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';
import {
  competenceRange,
  currentCompetenceSaoPaulo,
  dueDateFor,
  parseDateString,
  todaySaoPaulo,
} from '../common/dates';

const oneDayBefore = (date: Date) => new Date(date.getTime() - 24 * 60 * 60 * 1000);

const BACKFILL_RECEIPT_NOTE = 'Histórico anterior à plataforma (lançado na matrícula)';

/**
 * Status de uma mensalidade retroativa criada junto com a matrícula.
 * 'PAID' assume o mês já quitado (migração de aluno antigo); 'OPEN' trata como dívida real e,
 * como o vencimento já passou, nasce OVERDUE em vez de esperar o cron diário.
 */
function backfillFields(
  mode: BackfillMode,
  dueDate: Date,
  today: Date,
): Pick<Prisma.TuitionInvoiceCreateManyInput, 'status' | 'paidAt' | 'receiptNote'> {
  if (mode === 'PAID') {
    return { status: 'PAID', paidAt: dueDate, receiptNote: BACKFILL_RECEIPT_NOTE };
  }
  if (mode === 'OPEN' && dueDate < today) {
    return { status: 'OVERDUE' };
  }
  return {};
}

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(schoolId: string) {
    return this.prisma.enrollment.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
      include: {
        student: { select: { id: true, fullName: true } },
        classroom: { select: { id: true, name: true } },
      },
    });
  }

  async create(schoolId: string, input: CreateEnrollmentInput) {
    const [student, classroom] = await Promise.all([
      this.prisma.student.findFirst({ where: { id: input.studentId, schoolId } }),
      this.prisma.classroom.findFirst({ where: { id: input.classroomId, schoolId, active: true } }),
    ]);
    if (!student) throw new NotFoundException('Aluno não encontrado');
    if (!classroom) throw new NotFoundException('Turma não encontrada ou inativa');

    const existing = await this.prisma.enrollment.findFirst({
      where: { schoolId, studentId: input.studentId, status: 'ACTIVE' },
    });
    if (existing) {
      throw new BadRequestException('Aluno já possui matrícula ativa. Encerre a atual antes de criar outra.');
    }

    const activeCount = await this.prisma.enrollment.count({
      where: { schoolId, classroomId: input.classroomId, status: 'ACTIVE' },
    });
    if (activeCount >= classroom.capacity) {
      throw new BadRequestException(`Turma lotada (${activeCount}/${classroom.capacity}).`);
    }

    const startDate = parseDateString(input.startDate);
    const currentCompetence = currentCompetenceSaoPaulo();

    // Da competência de início até a atual. Vazia quando a matrícula começa num mês futuro —
    // nesse caso o cron mensal gera a primeira mensalidade quando o mês chegar.
    const competences = competenceRange(startDate, currentCompetence);
    const pastCompetences = competences.slice(0, -1);
    if (input.backfillMode !== 'NONE' && pastCompetences.length > MAX_BACKFILL_MONTHS) {
      throw new BadRequestException(
        `Início retroativo de ${pastCompetences.length} meses excede o limite de ${MAX_BACKFILL_MONTHS}. Confira a data de início.`,
      );
    }
    const invoicesToCreate = input.backfillMode === 'NONE' ? competences.slice(-1) : competences;

    return this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.create({
        data: {
          schoolId,
          studentId: input.studentId,
          classroomId: input.classroomId,
          startDate,
          monthlyFeeCents: input.monthlyFeeCents,
          discountCents: input.discountCents,
          discountReason: input.discountReason,
          dueDay: input.dueDay,
          enrollmentFeeCents: input.enrollmentFeeCents,
          notes: input.notes,
        },
      });
      if (student.status !== 'ACTIVE') {
        await tx.student.update({ where: { id: student.id }, data: { status: 'ACTIVE' } });
      }

      if (invoicesToCreate.length > 0) {
        const today = todaySaoPaulo();
        await tx.tuitionInvoice.createMany({
          data: invoicesToCreate.map((competence) => {
            const dueDate = dueDateFor(competence, input.dueDay);
            const retroactive = competence < currentCompetence;
            return {
              schoolId,
              enrollmentId: enrollment.id,
              competence,
              amountCents: input.monthlyFeeCents,
              discountCents: input.discountCents,
              dueDate,
              ...backfillFields(retroactive ? input.backfillMode : 'NONE', dueDate, today),
            };
          }),
        });
      }

      return { ...enrollment, backfilledMonths: Math.max(invoicesToCreate.length - 1, 0) };
    });
  }

  async end(schoolId: string, id: string, input: EndEnrollmentInput) {
    const enrollment = await this.prisma.enrollment.findFirst({ where: { id, schoolId } });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada');
    if (enrollment.status !== 'ACTIVE') throw new BadRequestException('Matrícula já encerrada');

    return this.prisma.enrollment.update({
      where: { id },
      data: { status: input.status, endDate: parseDateString(input.endDate) },
    });
  }

  async updateStartDate(schoolId: string, id: string, input: UpdateEnrollmentStartDateInput) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id, schoolId },
      include: { invoices: { select: { competence: true } } },
    });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada');

    const startDate = parseDateString(input.startDate);
    if (enrollment.endDate && startDate > enrollment.endDate) {
      throw new BadRequestException('A data de início não pode ser posterior ao encerramento da matrícula.');
    }

    const currentCompetence = currentCompetenceSaoPaulo();
    const expectedCompetences = competenceRange(startDate, currentCompetence);
    const expectedKeys = new Set(expectedCompetences.map((competence) => competence.toISOString()));
    const existingKeys = new Set(enrollment.invoices.map((invoice) => invoice.competence.toISOString()));
    const invoicesToCreate = expectedCompetences.filter((competence) => !existingKeys.has(competence.toISOString()));

    return this.prisma.$transaction(async (tx) => {
      // A data de matrícula determina quais competências existem. Ao corrigi-la,
      // removemos lançamentos fora do novo período e criamos os que estiverem faltando.
      if (expectedCompetences.length === 0) {
        await tx.tuitionInvoice.deleteMany({ where: { schoolId, enrollmentId: id } });
      } else {
        await tx.tuitionInvoice.deleteMany({
          where: {
            schoolId,
            enrollmentId: id,
            competence: { notIn: expectedCompetences },
          },
        });
      }

      if (invoicesToCreate.length > 0) {
        const today = todaySaoPaulo();
        await tx.tuitionInvoice.createMany({
          data: invoicesToCreate.map((competence) => {
            const dueDate = dueDateFor(competence, enrollment.dueDay);
            const retroactive = competence < currentCompetence;
            return {
              schoolId,
              enrollmentId: id,
              competence,
              amountCents: enrollment.monthlyFeeCents,
              discountCents: enrollment.discountCents,
              dueDate,
              ...backfillFields(retroactive ? 'OPEN' : 'NONE', dueDate, today),
            };
          }),
        });
      }

      return tx.enrollment.update({
        where: { id },
        data: { startDate },
      });
    });
  }

  /**
   * Sugestão de desconto de irmãos: procura outro aluno ativo cujo responsável
   * financeiro tenha o mesmo telefone/CPF (assunção 3 da spec).
   */
  async siblingCheck(schoolId: string, studentId: string) {
    const financial = await this.prisma.guardian.findFirst({
      where: { schoolId, studentId, isFinancialResponsible: true },
    });
    if (!financial) return { hasSibling: false };

    const sibling = await this.prisma.guardian.findFirst({
      where: {
        schoolId,
        isFinancialResponsible: true,
        studentId: { not: studentId },
        student: { status: 'ACTIVE' },
        OR: [
          { phoneWhatsapp: financial.phoneWhatsapp },
          ...(financial.cpf ? [{ cpf: financial.cpf }] : []),
        ],
      },
      include: { student: { select: { fullName: true } } },
    });
    return sibling
      ? { hasSibling: true, siblingName: sibling.student.fullName, suggestedDiscountPercent: 10 }
      : { hasSibling: false };
  }

  /**
   * Rematrícula em lote (spec seção 6): clona matrículas ativas de uma turma pra outra
   * (normalmente a turma do ano seguinte), com reajuste % em massa (editável por aluno),
   * e cobra a taxa de matrícula embutida na primeira mensalidade (competência de janeiro).
   */
  async renewBatch(schoolId: string, input: RenewBatchInput) {
    const targetClassroom = await this.prisma.classroom.findFirst({
      where: { id: input.targetClassroomId, schoolId },
    });
    if (!targetClassroom) throw new NotFoundException('Turma de destino não encontrada');

    const activeEnrollments = await this.prisma.enrollment.findMany({
      where: { schoolId, classroomId: input.classroomId, status: 'ACTIVE' },
    });
    if (activeEnrollments.length === 0) {
      throw new BadRequestException('Não há matrículas ativas nesta turma para rematricular');
    }
    if (activeEnrollments.length > targetClassroom.capacity) {
      throw new BadRequestException(
        `Turma de destino comporta ${targetClassroom.capacity} alunos, mas há ${activeEnrollments.length} para rematricular.`,
      );
    }

    const newStartDate = parseDateString(input.newStartDate);
    const januaryCompetence = new Date(Date.UTC(newStartDate.getUTCFullYear(), 0, 1));
    const overrideByEnrollment = new Map(input.overrides.map((o) => [o.enrollmentId, o.monthlyFeeCents]));

    return this.prisma.$transaction(async (tx) => {
      let renewed = 0;
      for (const old of activeEnrollments) {
        await tx.enrollment.update({
          where: { id: old.id },
          data: { status: 'ENDED', endDate: oneDayBefore(newStartDate) },
        });

        const newMonthlyFeeCents =
          overrideByEnrollment.get(old.id) ?? Math.round(old.monthlyFeeCents * (1 + input.readjustPercent / 100));

        const newEnrollment = await tx.enrollment.create({
          data: {
            schoolId,
            studentId: old.studentId,
            classroomId: input.targetClassroomId,
            startDate: newStartDate,
            monthlyFeeCents: newMonthlyFeeCents,
            discountCents: old.discountCents,
            discountReason: old.discountReason,
            dueDay: old.dueDay,
            enrollmentFeeCents: old.enrollmentFeeCents,
            notes: old.notes,
          },
        });

        // Invoice avulsa de janeiro já embutindo a taxa de matrícula — evita conflito
        // com a geração automática mensal, que usa a mesma chave (schoolId, enrollmentId, competence).
        const enrollmentFee = input.chargeEnrollmentFee ? old.enrollmentFeeCents : 0;
        await tx.tuitionInvoice.create({
          data: {
            schoolId,
            enrollmentId: newEnrollment.id,
            competence: januaryCompetence,
            amountCents: newMonthlyFeeCents + enrollmentFee,
            discountCents: old.discountCents,
            dueDate: dueDateFor(januaryCompetence, old.dueDay),
          },
        });

        renewed += 1;
      }
      return { renewed };
    });
  }
}
