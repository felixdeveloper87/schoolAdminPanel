import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEnrollmentInput, EndEnrollmentInput, RenewBatchInput } from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { currentCompetenceSaoPaulo, dueDateFor, monthRange, parseDateString } from '../common/dates';

const oneDayBefore = (date: Date) => new Date(date.getTime() - 24 * 60 * 60 * 1000);

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
    const { end: nextMonth } = monthRange(currentCompetence);

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

      if (startDate < nextMonth) {
        await tx.tuitionInvoice.create({
          data: {
            schoolId,
            enrollmentId: enrollment.id,
            competence: currentCompetence,
            amountCents: input.monthlyFeeCents,
            discountCents: input.discountCents,
            dueDate: dueDateFor(currentCompetence, input.dueDay),
          },
        });
      }

      return enrollment;
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
