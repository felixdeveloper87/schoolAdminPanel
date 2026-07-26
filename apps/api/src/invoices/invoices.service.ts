import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, InvoiceType, Prisma } from '@prisma/client';
import { CreateAdditionalInvoiceInput, PayInvoiceInput } from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { dueDateFor, monthRange, parseDateString, todaySaoPaulo } from '../common/dates';
import { PageParams, paged } from '../common/pagination';

function addMonthsKeepingDay(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

export function splitAdditionalCharge(input: {
  schoolId: string;
  enrollmentId: string;
  type: Exclude<InvoiceType, 'MONTHLY_TUITION'>;
  amountCents: number;
  competence: Date;
  dueDate: Date;
  installments: number;
}): Prisma.TuitionInvoiceCreateManyInput[] {
  const base = Math.floor(input.amountCents / input.installments);
  const remainder = input.amountCents % input.installments;
  return Array.from({ length: input.installments }, (_, index) => ({
    schoolId: input.schoolId,
    enrollmentId: input.enrollmentId,
    type: input.type,
    competence: new Date(Date.UTC(input.competence.getUTCFullYear(), input.competence.getUTCMonth() + index, 1)),
    amountCents: base + (index < remainder ? 1 : 0),
    dueDate: addMonthsKeepingDay(input.dueDate, index),
    installmentNumber: index + 1,
    installmentCount: input.installments,
  }));
}

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    schoolId: string,
    filters: { competence?: Date; status?: InvoiceStatus; type?: InvoiceType },
    pageParams: PageParams,
  ) {
    // Recupera faturas cujo cron diário não tenha sido executado (por exemplo, durante um reinício).
    await this.markOverdue(schoolId);

    const where: Prisma.TuitionInvoiceWhereInput = {
      schoolId,
      ...(filters.competence ? { competence: filters.competence } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { type: filters.type } : {}),
    };

    const [items, total, summary] = await this.prisma.$transaction([
      this.prisma.tuitionInvoice.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }],
        skip: pageParams.skip,
        take: pageParams.take,
        include: {
          enrollment: {
            include: {
              student: { select: { id: true, fullName: true } },
              classroom: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.tuitionInvoice.count({ where }),
      this.prisma.tuitionInvoice.groupBy({
        by: ['status'],
        where: { schoolId, ...(filters.competence ? { competence: filters.competence } : {}) },
        orderBy: { status: 'asc' },
        _sum: { amountCents: true, discountCents: true },
        _count: true,
      }),
    ]);

    const mapped = items.map((i) => ({
      id: i.id,
      competence: i.competence,
      type: i.type,
      installmentNumber: i.installmentNumber,
      installmentCount: i.installmentCount,
      amountCents: i.amountCents,
      discountCents: i.discountCents,
      effectiveCents: i.amountCents - i.discountCents,
      dueDate: i.dueDate,
      status: i.status,
      paidAt: i.paidAt,
      paymentMethod: i.paymentMethod,
      receiptNote: i.receiptNote,
      student: i.enrollment.student,
      classroom: i.enrollment.classroom,
    }));

    const summaryByStatus = Object.fromEntries(
      summary.map((s) => [
        s.status,
        { count: s._count, totalCents: (s._sum?.amountCents ?? 0) - (s._sum?.discountCents ?? 0) },
      ]),
    );

    return { ...paged(mapped, total, pageParams), summaryByStatus };
  }

  /** Detalhe de uma mensalidade com dados para o recibo (escola, aluno e responsável financeiro). */
  async getOne(schoolId: string, id: string) {
    const invoice = await this.prisma.tuitionInvoice.findFirst({
      where: { id, schoolId },
      include: {
        school: { select: { name: true, cnpj: true, phone: true, address: true } },
        enrollment: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                guardians: {
                  where: { isFinancialResponsible: true },
                  select: { fullName: true, cpf: true },
                  take: 1,
                },
              },
            },
            classroom: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Mensalidade não encontrada');
    const { guardians, ...student } = invoice.enrollment.student;
    return {
      id: invoice.id,
      competence: invoice.competence,
      type: invoice.type,
      installmentNumber: invoice.installmentNumber,
      installmentCount: invoice.installmentCount,
      amountCents: invoice.amountCents,
      discountCents: invoice.discountCents,
      effectiveCents: invoice.amountCents - invoice.discountCents,
      dueDate: invoice.dueDate,
      status: invoice.status,
      paidAt: invoice.paidAt,
      paymentMethod: invoice.paymentMethod,
      receiptNote: invoice.receiptNote,
      student,
      classroom: invoice.enrollment.classroom,
      financialGuardian: guardians[0] ?? null,
      school: invoice.school,
    };
  }

  /** Geração idempotente das mensalidades da competência (unique + skipDuplicates). */
  async generate(schoolId: string, competence: Date) {
    const { end: nextMonth } = monthRange(competence);
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
        // Matrículas iniciadas em meses posteriores não podem ser cobradas retroativamente.
        startDate: { lt: nextMonth },
      },
    });
    const result = await this.prisma.tuitionInvoice.createMany({
      data: enrollments.map((e) => ({
        schoolId,
        enrollmentId: e.id,
        competence,
        type: 'MONTHLY_TUITION',
        amountCents: e.monthlyFeeCents,
        discountCents: e.discountCents,
        dueDate: dueDateFor(competence, e.dueDay),
      })),
      skipDuplicates: true,
    });
    return { generated: result.count, activeEnrollments: enrollments.length };
  }

  async createAdditional(schoolId: string, input: CreateAdditionalInvoiceInput) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: input.enrollmentId, schoolId },
      select: { id: true },
    });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada');

    const competence = new Date(`${input.competence}T00:00:00.000Z`);
    const invoices = splitAdditionalCharge({
      schoolId,
      enrollmentId: enrollment.id,
      type: input.type,
      amountCents: input.amountCents,
      competence,
      dueDate: parseDateString(input.dueDate),
      installments: input.installments,
    });
    const duplicate = await this.prisma.tuitionInvoice.findFirst({
      where: {
        schoolId,
        enrollmentId: enrollment.id,
        type: input.type,
        competence: { in: invoices.map((invoice) => new Date(invoice.competence)) },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException('Este aluno já possui esta cobrança nesta competência.');
    }
    await this.prisma.tuitionInvoice.createMany({ data: invoices });
    return { created: invoices.length };
  }

  async pay(schoolId: string, id: string, input: PayInvoiceInput) {
    const invoice = await this.find(schoolId, id);
    if (invoice.status !== 'PENDING' && invoice.status !== 'OVERDUE') {
      throw new BadRequestException('Só mensalidades pendentes ou atrasadas podem ser pagas');
    }
    return this.prisma.tuitionInvoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: parseDateString(input.paidAt),
        paymentMethod: input.method,
        receiptNote: input.receiptNote,
      },
    });
  }

  async revert(schoolId: string, id: string) {
    const invoice = await this.find(schoolId, id);
    if (invoice.status !== 'PAID') {
      throw new BadRequestException('Só mensalidades pagas podem ser desfeitas');
    }
    const status: InvoiceStatus = invoice.dueDate < todaySaoPaulo() ? 'OVERDUE' : 'PENDING';
    return this.prisma.tuitionInvoice.update({
      where: { id },
      data: { status, paidAt: null, paymentMethod: null, receiptNote: null },
    });
  }

  async exempt(schoolId: string, id: string) {
    const invoice = await this.find(schoolId, id);
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Desfaça o pagamento antes de isentar');
    }
    return this.prisma.tuitionInvoice.update({ where: { id }, data: { status: 'EXEMPT' } });
  }

  /** PENDING vencidas → OVERDUE. Roda no cron diário e pode ser chamada manualmente. */
  async markOverdue(schoolId?: string) {
    const result = await this.prisma.tuitionInvoice.updateMany({
      where: {
        ...(schoolId ? { schoolId } : {}),
        status: 'PENDING',
        dueDate: { lt: todaySaoPaulo() },
      },
      data: { status: 'OVERDUE' },
    });
    return { marked: result.count };
  }

  private async find(schoolId: string, id: string) {
    const invoice = await this.prisma.tuitionInvoice.findFirst({ where: { id, schoolId } });
    if (!invoice) throw new NotFoundException('Mensalidade não encontrada');
    return invoice;
  }
}
