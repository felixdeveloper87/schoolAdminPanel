import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PayInvoiceInput } from '@escola/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { dueDateFor, parseDateString, todaySaoPaulo } from '../common/dates';
import { PageParams, paged } from '../common/pagination';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    schoolId: string,
    filters: { competence?: Date; status?: InvoiceStatus },
    pageParams: PageParams,
  ) {
    const where: Prisma.TuitionInvoiceWhereInput = {
      schoolId,
      ...(filters.competence ? { competence: filters.competence } : {}),
      ...(filters.status ? { status: filters.status } : {}),
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
    const enrollments = await this.prisma.enrollment.findMany({
      where: { schoolId, status: 'ACTIVE' },
    });
    const result = await this.prisma.tuitionInvoice.createMany({
      data: enrollments.map((e) => ({
        schoolId,
        enrollmentId: e.id,
        competence,
        amountCents: e.monthlyFeeCents,
        discountCents: e.discountCents,
        dueDate: dueDateFor(competence, e.dueDay),
      })),
      skipDuplicates: true,
    });
    return { generated: result.count, activeEnrollments: enrollments.length };
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
