import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateExpenseCategoryInput, CreateExpenseInput, UpdateExpenseInput } from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { monthRange, parseDateString } from '../common/dates';
import { PageParams, paged } from '../common/pagination';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(schoolId: string, competence: Date | undefined, pageParams: PageParams) {
    const where: Prisma.ExpenseWhereInput = {
      schoolId,
      ...(competence
        ? { expenseDate: { gte: monthRange(competence).start, lt: monthRange(competence).end } }
        : {}),
    };
    const [items, total, sum] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip: pageParams.skip,
        take: pageParams.take,
        include: { category: true },
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({ where, _sum: { amountCents: true } }),
    ]);
    return { ...paged(items, total, pageParams), totalCents: sum._sum.amountCents ?? 0 };
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
