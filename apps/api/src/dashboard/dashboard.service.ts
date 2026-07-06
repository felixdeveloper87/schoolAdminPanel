import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { competenceToString, monthRange } from '../common/dates';

function subMonths(competence: Date, delta: number): Date {
  return new Date(Date.UTC(competence.getUTCFullYear(), competence.getUTCMonth() - delta, 1));
}

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

  /**
   * Projeção de receita (só ADMIN, spec seção 7): soma das mensalidades ativas ×
   * (1 − taxa de inadimplência média dos últimos 6 meses fechados). Cenário simples, sem ML.
   */
  async projection(schoolId: string, competence: Date) {
    const activeEnrollments = await this.prisma.enrollment.findMany({
      where: { schoolId, status: 'ACTIVE' },
      select: { monthlyFeeCents: true, discountCents: true },
    });
    const monthlyRevenueCents = activeEnrollments.reduce(
      (sum, e) => sum + (e.monthlyFeeCents - e.discountCents),
      0,
    );

    // Últimos 6 meses fechados (não inclui o mês corrente, que ainda pode ter invoices em aberto legitimamente)
    const closedMonths = Array.from({ length: 6 }, (_, i) => subMonths(competence, i + 1));
    const rates: number[] = [];
    for (const month of closedMonths) {
      const [overdueCount, totalCount] = await Promise.all([
        this.prisma.tuitionInvoice.count({ where: { schoolId, competence: month, status: 'OVERDUE' } }),
        this.prisma.tuitionInvoice.count({ where: { schoolId, competence: month } }),
      ]);
      if (totalCount > 0) rates.push(overdueCount / totalCount);
    }
    const avgDefaultRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

    const months = Array.from({ length: 6 }, (_, i) => {
      const projMonth = subMonths(competence, -(i + 1));
      return {
        competence: competenceToString(projMonth),
        projectedCents: Math.round(monthlyRevenueCents * (1 - avgDefaultRate)),
      };
    });

    return { avgDefaultRate, monthlyRevenueCents, months };
  }

  /** Gráficos de 12 meses (spec seção 7). */
  async charts(schoolId: string, competence: Date) {
    const months = Array.from({ length: 12 }, (_, i) => subMonths(competence, 11 - i));

    const [revenueVsExpenses, activeStudentsEvolution, goalVsActual, expensesByCategoryRaw, categories] =
      await Promise.all([
        Promise.all(
          months.map(async (month) => {
            const { start, end } = monthRange(month);
            const [receivedAgg, expensesAgg] = await Promise.all([
              this.prisma.tuitionInvoice.aggregate({
                where: { schoolId, status: 'PAID', paidAt: { gte: start, lt: end } },
                _sum: { amountCents: true, discountCents: true },
              }),
              this.prisma.expense.aggregate({
                where: { schoolId, expenseDate: { gte: start, lt: end } },
                _sum: { amountCents: true },
              }),
            ]);
            return {
              competence: competenceToString(month),
              receivedCents: (receivedAgg._sum.amountCents ?? 0) - (receivedAgg._sum.discountCents ?? 0),
              expensesCents: expensesAgg._sum.amountCents ?? 0,
            };
          }),
        ),
        Promise.all(
          months.map(async (month) => {
            const { start, end } = monthRange(month);
            const activeCount = await this.prisma.enrollment.count({
              where: {
                schoolId,
                status: { not: 'CANCELLED' },
                startDate: { lt: end },
                OR: [{ endDate: null }, { endDate: { gte: start } }],
              },
            });
            return { competence: competenceToString(month), activeCount };
          }),
        ),
        Promise.all(
          months.map(async (month) => {
            const { start, end } = monthRange(month);
            const [goal, actual] = await Promise.all([
              this.prisma.goal.findUnique({ where: { schoolId_month: { schoolId, month } } }),
              this.prisma.enrollment.count({ where: { schoolId, startDate: { gte: start, lt: end } } }),
            ]);
            return {
              competence: competenceToString(month),
              target: goal?.newStudentsTarget ?? null,
              actual,
            };
          }),
        ),
        this.prisma.expense.groupBy({
          by: ['categoryId'],
          where: { schoolId, ...monthRangeWhere(competence) },
          _sum: { amountCents: true },
        }),
        this.prisma.expenseCategory.findMany({ where: { schoolId } }),
      ]);

    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const expensesByCategory = expensesByCategoryRaw
      .map((row) => ({
        name: categoryById.get(row.categoryId)?.name ?? 'Outros',
        colorHex: categoryById.get(row.categoryId)?.colorHex ?? '#8A8F98',
        totalCents: row._sum.amountCents ?? 0,
      }))
      .sort((a, b) => b.totalCents - a.totalCents);

    return { revenueVsExpenses, activeStudentsEvolution, goalVsActual, expensesByCategory };
  }
}

function monthRangeWhere(competence: Date) {
  const { start, end } = monthRange(competence);
  return { expenseDate: { gte: start, lt: end } };
}
