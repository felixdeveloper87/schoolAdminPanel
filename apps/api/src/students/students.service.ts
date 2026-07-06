import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StudentStatus } from '@prisma/client';
import { CreateStudentInput, UpdateStudentInput } from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateString } from '../common/dates';
import { PageParams, paged } from '../common/pagination';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    schoolId: string,
    filters: { status?: StudentStatus; classroomId?: string; q?: string },
    pageParams: PageParams,
  ) {
    const where: Prisma.StudentWhereInput = {
      schoolId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.q
        ? { fullName: { contains: filters.q, mode: 'insensitive' } }
        : {}),
      ...(filters.classroomId
        ? { enrollments: { some: { classroomId: filters.classroomId, status: 'ACTIVE' } } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip: pageParams.skip,
        take: pageParams.take,
        include: {
          guardians: { where: { isFinancialResponsible: true } },
          enrollments: {
            where: { status: 'ACTIVE' },
            include: {
              classroom: { select: { id: true, name: true } },
              invoices: { where: { status: 'OVERDUE' }, select: { id: true }, take: 1 },
            },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    const mapped = items.map((s) => {
      const enrollment = s.enrollments[0] ?? null;
      return {
        id: s.id,
        fullName: s.fullName,
        birthDate: s.birthDate,
        status: s.status,
        enrollmentType: s.enrollmentType,
        allergies: s.allergies,
        classroom: enrollment?.classroom ?? null,
        monthlyFeeCents: enrollment ? enrollment.monthlyFeeCents - enrollment.discountCents : null,
        hasOverdue: (enrollment?.invoices.length ?? 0) > 0,
        financialGuardian: s.guardians[0]
          ? { fullName: s.guardians[0].fullName, phoneWhatsapp: s.guardians[0].phoneWhatsapp }
          : null,
      };
    });

    return paged(mapped, total, pageParams);
  }

  async detail(schoolId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId },
      include: {
        guardians: { orderBy: { isFinancialResponsible: 'desc' } },
        enrollments: {
          orderBy: { startDate: 'desc' },
          include: {
            classroom: true,
            invoices: { orderBy: { competence: 'desc' }, take: 12 },
          },
        },
      },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado');
    return student;
  }

  async create(schoolId: string, input: CreateStudentInput) {
    const { guardians, ...data } = input;
    return this.prisma.student.create({
      data: {
        schoolId,
        ...data,
        birthDate: parseDateString(data.birthDate),
        guardians: {
          create: guardians.map((g) => ({ schoolId, ...g })),
        },
      },
      include: { guardians: true },
    });
  }

  async update(schoolId: string, id: string, input: UpdateStudentInput) {
    await this.ensureExists(schoolId, id);
    const { guardians, ...data } = input;
    return this.prisma.$transaction(async (tx) => {
      await tx.guardian.deleteMany({ where: { studentId: id, schoolId } });
      return tx.student.update({
        where: { id },
        data: {
          ...data,
          birthDate: parseDateString(data.birthDate),
          guardians: { create: guardians.map((g) => ({ schoolId, ...g })) },
        },
        include: { guardians: true },
      });
    });
  }

  async updateStatus(schoolId: string, id: string, status: StudentStatus) {
    await this.ensureExists(schoolId, id);
    return this.prisma.student.update({ where: { id }, data: { status } });
  }

  private async ensureExists(schoolId: string, id: string) {
    const found = await this.prisma.student.findFirst({ where: { id, schoolId }, select: { id: true } });
    if (!found) throw new NotFoundException('Aluno não encontrado');
  }
}
