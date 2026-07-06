import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { competenceToString, monthRange } from '../common/dates';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(schoolId: string, competence: Date, role: Role) {
    const { start, end } = monthRange(competence);
    const month = competence.getUTCMonth() + 1;

    const [
      activeStudents,
      classrooms,
      receivedAgg,
      pendingAgg,
      overdueInvoices,
      expensesAgg,
      birthdayStudents,
      waitlistCount,
      goal,
    ] = await this.prisma.$transaction([
      this.prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
      this.prisma.classroom.findMany({ where: { schoolId, active: true }, select: { capacity: true } }),
      this.prisma.tuitionInvoice.aggregate({
        where: { schoolId, status: 'PAID', paidAt: { gte: start, lt: end } },
        _sum: { amountCents: true, discountCents: true },
        _count: true,
      }),
      this.prisma.tuitionInvoice.aggregate({
        where: { schoolId, status: 'PENDING', competence },
        _sum: { amountCents: true, discountCents: true },
        _count: true,
      }),
      this.prisma.tuitionInvoice.findMany({
        where: { schoolId, status: 'OVERDUE' },
        select: {
          amountCents: true,
          discountCents: true,
          enrollment: { select: { studentId: true } },
        },
      }),
      this.prisma.expense.aggregate({
        where: { schoolId, expenseDate: { gte: start, lt: end } },
        _sum: { amountCents: true },
      }),
      this.prisma.student.findMany({
        where: { schoolId, status: 'ACTIVE' },
        select: { id: true, fullName: true, birthDate: true },
      }),
      this.prisma.waitlistEntry.count({ where: { schoolId, status: 'WAITING' } }),
      this.prisma.goal.findUnique({
        where: { schoolId_month: { schoolId, month: competence } },
      }),
    ]);

    const capacity = classrooms.reduce((sum, c) => sum + c.capacity, 0);
    const receivedCents = (receivedAgg._sum.amountCents ?? 0) - (receivedAgg._sum.discountCents ?? 0);
    const pendingCents = (pendingAgg._sum.amountCents ?? 0) - (pendingAgg._sum.discountCents ?? 0);
    const overdueCents = overdueInvoices.reduce((sum, i) => sum + i.amountCents - i.discountCents, 0);
    const overdueStudents = new Set(overdueInvoices.map((i) => i.enrollment.studentId)).size;
    const expensesCents = expensesAgg._sum.amountCents ?? 0;

    const birthdays = birthdayStudents
      .filter((s) => s.birthDate.getUTCMonth() + 1 === month)
      .map((s) => ({ id: s.id, fullName: s.fullName, day: s.birthDate.getUTCDate() }))
      .sort((a, b) => a.day - b.day);

    return {
      competence: competenceToString(competence),
      activeStudents,
      capacity,
      occupancyRate: capacity > 0 ? activeStudents / capacity : 0,
      receivedCents,
      receivedCount: receivedAgg._count,
      pendingCents,
      pendingCount: pendingAgg._count,
      overdueCents,
      overdueCount: overdueInvoices.length,
      overdueStudents,
      overdueStudentsRate: activeStudents > 0 ? overdueStudents / activeStudents : 0,
      expensesCents,
      // Resultado líquido é restrito a ADMIN (spec, seção 4)
      netCents: role === 'ADMIN' ? receivedCents - expensesCents : null,
      birthdays,
      waitlistCount,
      goal: goal
        ? { newStudentsTarget: goal.newStudentsTarget, revenueTargetCents: goal.revenueTargetCents }
        : null,
    };
  }
}
