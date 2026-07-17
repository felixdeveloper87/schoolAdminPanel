import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StudentStatus } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { CreateStudentInput, UpdateStudentInput } from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateString, todaySaoPaulo } from '../common/dates';
import { PageParams, paged } from '../common/pagination';
import { STUDENT_PHOTOS_DIR } from '../uploads/uploads.constants';

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
        photoUrl: s.photoUrl,
        monthlyFeeCents: enrollment ? enrollment.monthlyFeeCents - enrollment.discountCents : null,
        hasOverdue: (enrollment?.invoices.length ?? 0) > 0,
        inactiveReason: s.inactiveReason,
        inactiveAt: s.inactiveAt,
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

  async updateStatus(schoolId: string, id: string, status: StudentStatus, reason?: string) {
    await this.ensureExists(schoolId, id);
    return this.prisma.$transaction(async (tx) => {
      if (status === 'INACTIVE') {
        // Desligar o aluno encerra a matrícula ativa — para de gerar mensalidade novas.
        await tx.enrollment.updateMany({
          where: { schoolId, studentId: id, status: 'ACTIVE' },
          data: { status: 'ENDED', endDate: todaySaoPaulo() },
        });
      }
      return tx.student.update({
        where: { id },
        data: {
          status,
          inactiveReason: status === 'INACTIVE' ? reason : null,
          inactiveAt: status === 'INACTIVE' ? todaySaoPaulo() : null,
        },
      });
    });
  }

  async remove(schoolId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId },
      select: { photoUrl: true },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado');

    // Exclusão definitiva: apaga mensalidades e matrículas antes do aluno
    // (responsáveis caem em cascata via onDelete: Cascade).
    await this.prisma.$transaction([
      this.prisma.tuitionInvoice.deleteMany({ where: { schoolId, enrollment: { studentId: id } } }),
      this.prisma.enrollment.deleteMany({ where: { schoolId, studentId: id } }),
      this.prisma.student.delete({ where: { id } }),
    ]);

    if (student.photoUrl) {
      const photoFilename = student.photoUrl.split('/').pop();
      if (photoFilename) {
        await unlink(join(STUDENT_PHOTOS_DIR, photoFilename)).catch(() => undefined);
      }
    }
    return { deleted: true };
  }

  async updatePhoto(schoolId: string, id: string, filename: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId },
      select: { photoUrl: true },
    });
    if (!student) throw new NotFoundException('Aluno não encontrado');

    const photoUrl = `/api/uploads/students/${filename}`;
    const updated = await this.prisma.student.update({ where: { id }, data: { photoUrl } });

    if (student.photoUrl) {
      const oldFilename = student.photoUrl.split('/').pop();
      if (oldFilename && oldFilename !== filename) {
        await unlink(join(STUDENT_PHOTOS_DIR, oldFilename)).catch(() => undefined);
      }
    }
    return updated;
  }

  private async ensureExists(schoolId: string, id: string) {
    const found = await this.prisma.student.findFirst({ where: { id, schoolId }, select: { id: true } });
    if (!found) throw new NotFoundException('Aluno não encontrado');
  }
}
