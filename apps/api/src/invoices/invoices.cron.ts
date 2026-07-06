import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { InvoicesService } from './invoices.service';
import { currentCompetenceSaoPaulo } from '../common/dates';

@Injectable()
export class InvoicesCron {
  private readonly logger = new Logger(InvoicesCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: InvoicesService,
  ) {}

  /** Dia 1º às 05:00 (São Paulo): gera as mensalidades do mês para todas as escolas. */
  @Cron('0 5 1 * *', { timeZone: 'America/Sao_Paulo' })
  async generateMonthlyInvoices() {
    const competence = currentCompetenceSaoPaulo();
    const schools = await this.prisma.school.findMany({ select: { id: true, name: true } });
    for (const school of schools) {
      const { generated } = await this.invoicesService.generate(school.id, competence);
      this.logger.log(`Mensalidades geradas para ${school.name}: ${generated}`);
    }
  }

  /** Diário às 06:00 (São Paulo): marca pendentes vencidas como OVERDUE. */
  @Cron('0 6 * * *', { timeZone: 'America/Sao_Paulo' })
  async markOverdueInvoices() {
    const { marked } = await this.invoicesService.markOverdue();
    if (marked > 0) this.logger.log(`Mensalidades marcadas como atrasadas: ${marked}`);
  }
}
