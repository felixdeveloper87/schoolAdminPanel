import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateExpenseCategoryInput, CreateExpenseInput, UpdateExpenseInput } from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { monthRange, parseDateString } from '../common/dates';
import { PageParams, paged } from '../common/pagination';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    schoolId: string,
    filters: { competence?: Date; categoryId?: string },
    pageParams: PageParams,
  ) {
    const where: Prisma.ExpenseWhereInput = {
      schoolId,
      ...(filters.competence
        ? { expenseDate: { gte: monthRange(filters.competence).start, lt: monthRange(filters.competence).end } }
        : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    };
    const [items, total, sum, byCategory] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip: pageParams.skip,
        take: pageParams.take,
        include: { category: true },
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({ where, _sum: { amountCents: true } }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where,
        orderBy: { categoryId: 'asc' },
        _sum: { amountCents: true },
        _count: true,
      }),
    ]);

    const categories = await this.prisma.expenseCategory.findMany({ where: { schoolId } });
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const summaryByCategory = byCategory
      .map((row) => ({
        categoryId: row.categoryId,
        name: categoryById.get(row.categoryId)?.name ?? 'Outros',
        colorHex: categoryById.get(row.categoryId)?.colorHex ?? '#8A8F98',
        totalCents: row._sum?.amountCents ?? 0,
        count: row._count,
      }))
      .sort((a, b) => b.totalCents - a.totalCents);

    return {
      ...paged(items, total, pageParams),
      totalCents: sum._sum.amountCents ?? 0,
      summaryByCategory,
    };
  }

  /** Total gasto por mês nos últimos N meses (para gráfico de tendência). */
  async monthlyTrend(schoolId: string, months: number) {
    const now = new Date();
    const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const results: { competence: string; totalCents: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const competence = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - i, 1));
      const { start, end } = monthRange(competence);
      const agg = await this.prisma.expense.aggregate({
        where: { schoolId, expenseDate: { gte: start, lt: end } },
        _sum: { amountCents: true },
      });
      const y = competence.getUTCFullYear();
      const m = String(competence.getUTCMonth() + 1).padStart(2, '0');
      results.push({ competence: `${y}-${m}`, totalCents: agg._sum.amountCents ?? 0 });
    }
    return results;
  }

  create(schoolId: string, input: CreateExpenseInput) {
    return this.prisma.expense.create({
      data: { schoolId, ...input, expenseDate: parseDateString(input.expenseDate) },
      include: { category: true },
    });
  }

  async update(schoolId: string, id: string, input: UpdateExpenseInput) {
    await this.ensureExists(schoolId, id);
    return this.prisma.expense.update({
      where: { id },
      data: { ...input, expenseDate: parseDateString(input.expenseDate) },
      include: { category: true },
    });
  }

  async remove(schoolId: string, id: string) {
    await this.ensureExists(schoolId, id);
    await this.prisma.expense.delete({ where: { id } });
    return { ok: true };
  }

  listCategories(schoolId: string) {
    return this.prisma.expenseCategory.findMany({ where: { schoolId }, orderBy: { name: 'asc' } });
  }

  createCategory(schoolId: string, input: CreateExpenseCategoryInput) {
    return this.prisma.expenseCategory.create({ data: { schoolId, ...input } });
  }

  private async ensureExists(schoolId: string, id: string) {
    const found = await this.prisma.expense.findFirst({ where: { id, schoolId }, select: { id: true } });
    if (!found) throw new NotFoundException('Despesa não encontrada');
  }
}
