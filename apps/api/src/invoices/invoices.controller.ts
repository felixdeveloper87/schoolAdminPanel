import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import {
  payInvoiceSchema,
  PayInvoiceInput,
  competenceString,
  INVOICE_STATUSES,
} from '@escola/contracts';
import { InvoicesService } from './invoices.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { JwtPayload } from '../auth/jwt-payload';
import { parsePageParams } from '../common/pagination';
import { parseCompetence } from '../common/dates';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('competence') competence?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const parsedCompetence =
      competence && competenceString.safeParse(competence).success
        ? parseCompetence(competence)
        : undefined;
    const validStatus = INVOICE_STATUSES.includes(status as InvoiceStatus)
      ? (status as InvoiceStatus)
      : undefined;
    return this.invoicesService.list(
      user.schoolId,
      { competence: parsedCompetence, status: validStatus },
      parsePageParams(page, pageSize, 50),
    );
  }

  @Post('generate')
  @Roles('ADMIN')
  generate(@CurrentUser() user: JwtPayload, @Query('competence') competence?: string) {
    const parsed = competenceString.safeParse(competence);
    if (!parsed.success) {
      throw new BadRequestException('Informe a competência no formato AAAA-MM');
    }
    return this.invoicesService.generate(user.schoolId, parseCompetence(parsed.data));
  }

  @Patch(':id/pay')
  pay(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(payInvoiceSchema)) body: PayInvoiceInput,
  ) {
    return this.invoicesService.pay(user.schoolId, id, body);
  }

  @Patch(':id/revert')
  @Roles('ADMIN')
  revert(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoicesService.revert(user.schoolId, id);
  }

  @Patch(':id/exempt')
  @Roles('ADMIN')
  exempt(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.invoicesService.exempt(user.schoolId, id);
  }
}
