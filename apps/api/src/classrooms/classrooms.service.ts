import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateClassroomInput, UpdateClassroomInput } from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassroomsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(schoolId: string) {
    const classrooms = await this.prisma.classroom.findMany({
      where: { schoolId },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { student: { select: { id: true, fullName: true } } },
        },
      },
    });
    return classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      ageGroup: c.ageGroup,
      shift: c.shift,
      capacity: c.capacity,
      active: c.active,
      activeCount: c.enrollments.length,
      occupancyRate: c.capacity > 0 ? c.enrollments.length / c.capacity : 0,
      students: c.enrollments.map((e) => e.student),
    }));
  }

  create(schoolId: string, input: CreateClassroomInput) {
    return this.prisma.classroom.create({ data: { schoolId, ...input } });
  }

  async update(schoolId: string, id: string, input: UpdateClassroomInput) {
    const found = await this.prisma.classroom.findFirst({ where: { id, schoolId }, select: { id: true } });
    if (!found) throw new NotFoundException('Turma não encontrada');
    return this.prisma.classroom.update({ where: { id }, data: input });
  }
}
