import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { monthRange } from '../common/dates';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Inadimplência: um aluno por linha, com total devido e contato do responsável financeiro. */
  async defaulters(schoolId: string) {
    const invoices = await this.prisma.tuitionInvoice.findMany({
      where: { schoolId, status: 'OVERDUE' },
      include: {
        enrollment: {
          include: {
            student: { select: { id: true, fullName: true } },
            classroom: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const byStudent = new Map<
      string,
      {
        student: { id: string; fullName: string };
        classroom: { id: string; name: string };
        totalOwedCents: number;
        invoiceCount: number;
        oldestDueDate: Date;
      }
    >();

    for (const invoice of invoices) {
      const studentId = invoice.enrollment.student.id;
      const owed = invoice.amountCents - invoice.discountCents;
      const existing = byStudent.get(studentId);
      if (existing) {
        existing.totalOwedCents += owed;
        existing.invoiceCount += 1;
        if (invoice.dueDate < existing.oldestDueDate) existing.oldestDueDate = invoice.dueDate;
      } else {
        byStudent.set(studentId, {
          student: invoice.enrollment.student,
          classroom: invoice.enrollment.classroom,
          totalOwedCents: owed,
          invoiceCount: 1,
          oldestDueDate: invoice.dueDate,
        });
      }
    }

    const studentIds = [...byStudent.keys()];
    const guardians = await this.prisma.guardian.findMany({
      where: { schoolId, studentId: { in: studentIds }, isFinancialResponsible: true },
    });
    const guardianByStudent = new Map(guardians.map((g) => [g.studentId, g]));

    return [...byStudent.values()]
      .map((row) => ({
        ...row,
        financialGuardian: guardianByStudent.has(row.student.id)
          ? {
              fullName: guardianByStudent.get(row.student.id)!.fullName,
              phoneWhatsapp: guardianByStudent.get(row.student.id)!.phoneWhatsapp,
            }
          : null,
      }))
      .sort((a, b) => b.totalOwedCents - a.totalOwedCents);
  }

  /** DRE simplificado: receita recebida - despesas por categoria = resultado. */
  async dre(schoolId: string, competence: Date) {
    const { start, end } = monthRange(competence);

    const [revenueAgg, expensesByCategory] = await Promise.all([
      this.prisma.tuitionInvoice.aggregate({
        where: { schoolId, status: 'PAID', paidAt: { gte: start, lt: end } },
        _sum: { amountCents: true, discountCents: true },
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { schoolId, expenseDate: { gte: start, lt: end } },
        _sum: { amountCents: true },
        orderBy: { categoryId: 'asc' },
      }),
    ]);

    const categories = await this.prisma.expenseCategory.findMany({ where: { schoolId } });
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const revenueCents = (revenueAgg._sum.amountCents ?? 0) - (revenueAgg._sum.discountCents ?? 0);
    const expenseRows = expensesByCategory
      .map((row) => ({
        categoryId: row.categoryId,
        categoryName: categoryById.get(row.categoryId)?.name ?? 'Outros',
        colorHex: categoryById.get(row.categoryId)?.colorHex ?? null,
        totalCents: row._sum.amountCents ?? 0,
      }))
      .sort((a, b) => b.totalCents - a.totalCents);
    const totalExpensesCents = expenseRows.reduce((sum, r) => sum + r.totalCents, 0);

    return {
      revenueCents,
      expensesByCategory: expenseRows,
      totalExpensesCents,
      resultCents: revenueCents - totalExpensesCents,
    };
  }
}
