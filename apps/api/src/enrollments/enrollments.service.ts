import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEnrollmentInput, EndEnrollmentInput } from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateString } from '../common/dates';

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

    return this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.create({
        data: {
          schoolId,
          studentId: input.studentId,
          classroomId: input.classroomId,
          startDate: parseDateString(input.startDate),
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
}
